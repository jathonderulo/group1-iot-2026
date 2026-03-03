#!/usr/bin/env bash
set -euo pipefail

# ====== Configuration ======
CERT_DIR="${CERT_DIR:-./certs}"
CA_KEY="$CERT_DIR/ca.key"
CA_CRT="$CERT_DIR/ca.crt"

BROKER_KEY="$CERT_DIR/broker.key"
BROKER_CSR="$CERT_DIR/broker.csr"
BROKER_CRT="$CERT_DIR/broker.crt"

# Certificate subject fields (edit if you like)
CA_SUBJECT="${CA_SUBJECT:-/C=IE/O=CS7NS2/OU=IoT/CN=CS7NS2 IoT CA}"
BROKER_SUBJECT="${BROKER_SUBJECT:-/C=IE/O=CS7NS2/OU=Gateway/CN=gateway-mqtt}"

# How long certs last (days)
CA_DAYS="${CA_DAYS:-3650}"
BROKER_DAYS="${BROKER_DAYS:-30}"     # short-lived is fine for dev/demo

# Which IP should be placed in SAN?
# - For hotspot demos, LAN IP is usually best (ESP32 reaches laptop via LAN)
# - For public internet, you'd need public IP + port forwarding (rare on mobile)
IP_MODE="${IP_MODE:-lan}"           # lan | public | custom
CUSTOM_IP="${CUSTOM_IP:-}"

# Optional extra DNS names to include in SAN (comma-separated)
# Example: EXTRA_DNS="mosquitto,gateway.local"
EXTRA_DNS="${EXTRA_DNS:-}"

# ====== Helpers ======
get_lan_ip() {
  # Try to get the primary LAN IP (Linux/macOS). Works well in most cases.
  # If you have multiple interfaces, you can set IP_MODE=custom and CUSTOM_IP=...
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}'
  elif command -v route >/dev/null 2>&1; then
    # macOS fallback
    route -n get 1.1.1.1 2>/dev/null | awk '/interface:/{iface=$2} END{print iface}' >/dev/null || true
    # Best-effort: use hostname -I if available
    if command -v hostname >/dev/null 2>&1; then
      hostname -I 2>/dev/null | awk '{print $1}'
    fi
  else
    echo ""
  fi
}

get_public_ip() {
  # Requires curl; only used if IP_MODE=public
  if command -v curl >/dev/null 2>&1; then
    curl -fsS ifconfig.me || true
  else
    echo ""
  fi
}

pick_ip() {
  case "$IP_MODE" in
    lan)
      get_lan_ip
      ;;
    public)
      get_public_ip
      ;;
    custom)
      echo "$CUSTOM_IP"
      ;;
    *)
      echo ""
      ;;
  esac
}

ensure_ca() {
  mkdir -p "$CERT_DIR"

  if [[ -f "$CA_KEY" && -f "$CA_CRT" ]]; then
    echo "[ok] Using existing CA: $CA_CRT"
    return
  fi

  echo "[gen] Creating new CA (first run only)..."
  openssl genrsa -out "$CA_KEY" 4096
  openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days "$CA_DAYS" \
    -subj "$CA_SUBJECT" -out "$CA_CRT"
  echo "[ok] Created CA cert: $CA_CRT"
  echo "     IMPORTANT: Copy $CA_CRT to your ESP32/mock trust store once."
}

make_san_file() {
  local ip="$1"
  local san_file="$CERT_DIR/broker_san.cnf"

  {
    echo "[ v3_req ]"
    echo "subjectAltName = @alt_names"
    echo
    echo "[ alt_names ]"
    echo "DNS.1 = localhost"
    echo "DNS.2 = gateway-mqtt"
    echo "IP.1  = 127.0.0.1"
    echo "IP.2  = $ip"
  } > "$san_file"

  # Add extra DNS entries if provided
  if [[ -n "$EXTRA_DNS" ]]; then
    IFS=',' read -ra dnsarr <<< "$EXTRA_DNS"
    local n=3
    for d in "${dnsarr[@]}"; do
      d="$(echo "$d" | xargs)"
      [[ -z "$d" ]] && continue
      echo "DNS.$n = $d" >> "$san_file"
      n=$((n+1))
    done
  fi

  echo "$san_file"
}

rotate_broker_cert() {
  local ip="$1"
  local san_file
  san_file="$(make_san_file "$ip")"

  echo "[gen] Generating broker key + CSR..."
  openssl genrsa -out "$BROKER_KEY" 2048
  openssl req -new -key "$BROKER_KEY" -subj "$BROKER_SUBJECT" -out "$BROKER_CSR"

  echo "[gen] Signing broker cert with CA (SAN includes IP=$ip)..."
  openssl x509 -req -in "$BROKER_CSR" -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
    -out "$BROKER_CRT" -days "$BROKER_DAYS" -sha256 -extfile "$san_file" -extensions v3_req

  echo "[ok] Wrote:"
  echo "     CA:     $CA_CRT"
  echo "     Broker: $BROKER_CRT"
  echo "     Key:    $BROKER_KEY"
}

main() {
  ensure_ca

  ip="$(pick_ip)"
  if [[ -z "${ip:-}" ]]; then
    echo "[err] Could not determine IP automatically."
    echo "      Try: IP_MODE=custom CUSTOM_IP=192.168.1.50 $0"
    exit 1
  fi

  echo "[info] Using IP for SAN: $ip (mode=$IP_MODE)"
  rotate_broker_cert "$ip"

  echo
  echo "[next] Restart/reload Mosquitto to use new certs."
  echo "       If using docker-compose: docker compose restart mosquitto"
}

main "$@"