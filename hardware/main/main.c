#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "driver/gpio.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "mqtt_client.h"
#include "esp_log.h"

#define PIN_SENSOR GPIO_NUM_4
#define PIN_R GPIO_NUM_2
#define PIN_G GPIO_NUM_3
#define PIN_B GPIO_NUM_10

static const char *TAG = "ESP32_LED";
static EventGroupHandle_t s_wifi_event_group;
static esp_mqtt_client_handle_t client;

/* track the current and last-reported seat/LED state */
bool seat_occupied = false;
bool last_state = false;

static void set_rgb(int r, int g, int b) {
    gpio_set_level(PIN_R, r);
    gpio_set_level(PIN_G, g);
    gpio_set_level(PIN_B, b);
}

// WiFi event handler
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                                int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        esp_wifi_connect();
        ESP_LOGI(TAG, "retry to connect to the AP");
    }
    else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&event->ip_info.ip));
    }
}

// WiFi initialization
static void wifi_init_sta(void)
{
    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT,
                                                        ESP_EVENT_ANY_ID,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT,
                                                        IP_EVENT_STA_GOT_IP,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA) );
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config) );
    ESP_ERROR_CHECK(esp_wifi_start() );

    ESP_LOGI(TAG, "wifi_init_sta finished.");
}

// MQTT event handler
static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data)
{
    ESP_LOGD(TAG, "Event dispatched from event loop base=%s, event_id=%ld", base, event_id);
    esp_mqtt_event_handle_t event = event_data;

    switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(TAG, "MQTT_EVENT_CONNECTED");
        break;
    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGI(TAG, "MQTT_EVENT_DISCONNECTED");
        break;
    case MQTT_EVENT_SUBSCRIBED:
        ESP_LOGI(TAG, "MQTT_EVENT_SUBSCRIBE, msg_id=%d", event->msg_id);
        break;
    case MQTT_EVENT_UNSUBSCRIBED:
        ESP_LOGI(TAG, "MQTT_EVENT_UNSUBSCRIBE, msg_id=%d", event->msg_id);
        break;
    case MQTT_EVENT_PUBLISHED:
        ESP_LOGI(TAG, "MQTT_EVENT_PUBLISH, msg_id=%d", event->msg_id);
        break;
    case MQTT_EVENT_DATA:
        ESP_LOGI(TAG, "MQTT_EVENT_DATA");
        break;
    case MQTT_EVENT_ERROR:
        ESP_LOGI(TAG, "MQTT_EVENT_ERROR");
        break;
    default:
        ESP_LOGI(TAG, "Other event id:%d", event->event_id);
        break;
    }
}

// MQTT initialization
static void mqtt_init(void)
{
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = MQTT_BROKER_URI,
    };
    client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
}

// Task to monitor LED status and publish to MQTT
static void mqtt_publish_task(void *pvParameter)
{
    char payload[256];
    while (1) {
        /* always publish current state every 5 seconds */
        snprintf(payload, sizeof(payload), "{\"person_present\": %d, \"stuff_on_desk\": %d}", 
                 seat_occupied, seat_occupied);
        esp_mqtt_client_publish(client, MQTT_TOPIC, payload, 0, 1, 0);
        ESP_LOGI(TAG, "Published: %s on topic %s", payload, MQTT_TOPIC);

        /* keep track of last state in case other logic needs it */
        last_state = seat_occupied;

        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}

void app_main(void) {
    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // Initialize GPIO
    gpio_reset_pin(PIN_R);
    gpio_reset_pin(PIN_G);
    gpio_reset_pin(PIN_B);
    gpio_reset_pin(PIN_SENSOR);

    gpio_set_direction(PIN_R, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_G, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_B, GPIO_MODE_OUTPUT);
    gpio_set_direction(PIN_SENSOR, GPIO_MODE_INPUT);
    gpio_set_pull_mode(PIN_SENSOR, GPIO_PULLUP_ONLY);

    // Initialize WiFi
    wifi_init_sta();
    vTaskDelay(pdMS_TO_TICKS(3000)); // Wait for WiFi connection

    // Initialize MQTT
    mqtt_init();
    vTaskDelay(pdMS_TO_TICKS(2000)); // Wait for MQTT connection

    // Create task for publishing LED status
    xTaskCreate(mqtt_publish_task, "mqtt_pub", 2048, NULL, 5, NULL);
    ESP_LOGI("TEST", "About to start main loop");

    // Main sensor loop
    while (1) {
        seat_occupied = gpio_get_level(PIN_SENSOR);
        if (!seat_occupied) {
            set_rgb(1, 0, 0);  // Red LED when occupied
        } else {
            set_rgb(0, 1, 0);  // Green LED when vacant
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
