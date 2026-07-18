# MongoDB Atlas setup for semantic connections

## 1. Create a MongoDB Atlas cluster
- Create an account at https://www.mongodb.com/atlas
- Create a free cluster
- Create a database user and a network access entry for 0.0.0.0/0 (for local hackathon testing)

## 2. Create the collection
In the Atlas UI, create a database named `worldview` and a collection named `semantic_connections`.

## 3. Insert a sample document
Use Atlas Data Explorer or insert one document like this:

```json
{
  "fromIso2": "MA",
  "toIso2": "IN",
  "label": "Moroccan spice routes carried cumin and saffron along trade roads into South Asian cooking"
}
```

## 4. Add the environment variables
Add these to your `.env.local` file:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
MONGODB_DB=worldview
```

## 5. Restart the app
Run:

```bash
npm run dev
```

If `MONGODB_URI` is missing or invalid, the app will automatically fall back to the hardcoded connection list from [src/lib/geo-types.ts](src/lib/geo-types.ts).
