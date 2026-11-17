# Test cards for the pretend bank (decision D-99)

NoWaste uses a **pretend bank** instead of a real payment gateway during the course (SRS 2.5, IF-SW-07). It lives in
its own database schema, `mock_bank`, separate from NoWaste's data. Card numbers and CVVs are stored only as SHA-256
hashes. The cards below are created by the migration `1794258000000_create-mock-bank`, so every laptop that runs
`npm run migrate` has the same cards. Nothing to share between teammates.

| Card number | Expiry | CVV | Balance (EGP) | Result |
| ----------- | ------ | --- | ------------- | ------ |
| 40000000    | 12/30  | 123 | 10,000        | Approved |
| 40000001    | 12/30  | 123 | 10,000        | Approved (a second card, for testing two phones at once) |
| 40000002    | 12/30  | 123 | 10,000        | Declined: the card is blocked (`declined`) |
| 40000003    | 12/30  | 123 | 5             | Declined: not enough money (`insufficient_funds`) |
| 40000004    | 10/26  | 123 | 10,000        | Declined: the card expired in October 2026 (`expired_card`) |
| 40000005    | 12/30  | 123 | 10,000        | The bank never answers; after `PAYMENT-TIMEOUT` (60 s) the payment fails (`timeout`) |
| any other 8 digits | any | any | –      | Declined: card not found (`unknown_card`) |
| a card above with a wrong expiry or CVV | | | | Declined: `wrong_details` |

Each payment takes the listing's price from the card's balance. To put the balances back:

```sql
UPDATE mock_bank.cards SET balance = seeded_balance;
```

(for example with `docker exec nowaste-db psql -U nowaste -d nowaste -c "..."`).

## How a payment works

1. The app sends the card to `POST /mock-bank/tokens` (the bank's card page) and gets a one-time token.
2. The app sends only that token with `POST /reservations` `{listingId, method: "card", paymentToken}`.
3. NoWaste takes the bag, charges the token through the Payment Gateway Adapter and keeps only the result and the
   bank's reference (`payments` table). A failure gives `402 {"error":"E-RES-01","reason":"..."}` and the bag stays
   available.

When a real sandbox gateway is chosen (SRS TBD-2), only the adapter in `server/src/adapters/payment-gateway` and the
card page change; the rest of NoWaste stays the same.
