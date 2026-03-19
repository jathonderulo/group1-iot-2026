import unittest
from unittest.mock import patch

import main


class CollectorTests(unittest.TestCase):
    def test_validate_payload_accepts_valid_message(self):
        err = main.validate_payload(
            "desks/D01/state",
            {"desk_id": "D01", "occupied": True, "noise_band": 1},
        )
        self.assertIsNone(err)

    def test_validate_payload_rejects_bad_topic(self):
        err = main.validate_payload("desks/D01", {"occupied": True, "noise_band": 1})
        self.assertEqual(err, "Invalid topic format")

    @patch("main.requests.post")
    def test_forward_to_ec2_posts_envelope(self, mock_post):
        main.EC2_INGEST_URL = "http://forwarder:9090/ingest"
        main.EC2_TOKEN = "token"
        mock_post.return_value.status_code = 200

        payload = {"desk_id": "D01", "occupied": True, "noise_band": 1, "ts": 1}
        main.forward_to_ec2("desks/D01/state", payload)

        mock_post.assert_called_once()
        call = mock_post.call_args
        self.assertEqual(call.kwargs["json"]["topic"], "desks/D01/state")
        self.assertEqual(call.kwargs["json"]["payload"], payload)
        self.assertEqual(call.kwargs["headers"]["Authorization"], "Bearer token")


if __name__ == "__main__":
    unittest.main()
