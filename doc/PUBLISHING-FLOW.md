# Publishing Flow

## Gelato → Shopify

**Gelato publishes to Shopify automatically.** When an artwork is published to Gelato (print-on-demand), Gelato creates the corresponding product in the linked Shopify store. The admin does not create Shopify products manually; it only links the Luxarise artwork to the Gelato-created Shopify product for tracking (e.g. via product ID lookup by title).

**Shopify API** (for product search by title) requires:
- `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP_URL`, `SHOPIFY_API_VERSION` in `.env.local`
- OAuth authorization: visit `/api/shopify/auth` once to connect (token stored in system config)
- Configure `read_products` scope in Dev Dashboard
- Add redirect URI: `https://your-domain/api/shopify/callback` (or `http://localhost:3000/api/shopify/callback` for dev)

## Workflow

1. **Content Complete** – Title, caption, metadata finalized
2. **Publish to Gelato** – Artwork goes to Gelato, product created in Shopify by Gelato
3. **Finalize in Shopify** – Link the artwork to the Shopify product (ID lookup by title), mark as finalized
