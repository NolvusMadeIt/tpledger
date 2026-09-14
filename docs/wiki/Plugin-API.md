# Plugin API

`start(api)` receives this object.

## api

| Method | What |
| --- | --- |
| `api.id` | Plugin id |
| `api.getSetting(key, fallback)` | Read a setting (or default) |
| `api.setSetting(key, value)` | Persist a setting on this machine |
| `api.on(event, fn)` | Subscribe. Returns an unsubscribe function |
| `api.notify(title, body)` | Desktop / browser notification + chime |
| `api.play(src?)` | Play `ding` (default chime) or a wav/mp3 path |
| `api.log(message)` | `console.info` prefixed with the plugin name |

## Events

### `item:checked`

Fired after a successful price check. Payload is an `ItemQuote`:

```
{
  id, name, rarity, type, subtype, icon,
  vendorValue, traded, whitelisted,
  buy, sell, buyQuantity, sellQuantity,
  instantSell, listNet, spread,
  buys[], sells[],
  chatLink
}
```

Prices are **copper**. `instantSell` is dump-to-buy-orders after 15% tax. `listNet` is list-at-sell after tax.

### `vault:loaded`

Fired after Vault refresh. Payload is the vault snapshot: account name, locations (bank / mats / shared / character), lines with counts and prices, totals.

## Settings types

- `boolean` — toggle
- `number` — numeric, honors `min` / `max`
- `text` — string
- `sound` — default chime or a user-picked wav/mp3 (`"ding"` = built-in)

## Don't

- Do not read the GW2 API key. You will not be given it.
- Do not block the UI. Keep handlers fast.
- Do not ship malware, key loggers, or scrape tokens.

Built-in examples: [`public/plugins/flip-watch`](https://github.com/NolvusMadeIt/tpledger/tree/main/public/plugins/flip-watch), [`public/plugins/chat-copy`](https://github.com/NolvusMadeIt/tpledger/tree/main/public/plugins/chat-copy).
