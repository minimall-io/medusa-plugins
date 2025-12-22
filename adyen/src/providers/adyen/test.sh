curl -X POST http://localhost:9000/hooks/payment/adyen_MinimallLLCECOM -H "Content-Type: application/json" -d '{
  "live": "false",
  "notificationItems": [
    {
      "NotificationRequestItem": {
        "amount": {
          "currency": "USD",
          "value": 2500
        },
        "eventCode": "REFUND",
        "eventDate": "2025-12-12T03:11:50+01:00",
        "merchantAccountCode": "MinimallLLCECOM",
        "merchantReference": "payses_01KC857R9DZPKM9TRKWFX6HTZM",
        "pspReference": "NLRZZPNQ8BXSPBV5",
        "reason": "",
        "success": "true"
      }
    }
  ]
}'