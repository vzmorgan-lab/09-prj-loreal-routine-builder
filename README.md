L'OREAL SMART ROUTINE BUILDER - SETUP

FILES
- index.html: page structure
- style.css: page design and responsive layout
- script.js: product filtering, selecting, localStorage, chat and Worker connection
- worker.js: code to paste into Cloudflare Workers
- products.json: product catalog with 35 products

1. FRONTEND FILES
Replace your starter index.html, style.css and script.js with the matching files here.
Keep products.json in the same folder as index.html.

2. CLOUDFLARE WORKER
Open Cloudflare Dashboard > Workers & Pages > your Worker > Edit Code.
Replace the Worker code with worker.js and deploy.

3. SECRET
In Worker Settings > Variables and Secrets, add a SECRET:
Name: OPENAI_API_KEY
Value: your OpenAI API key

Do not put the key in index.html, script.js, worker.js, or a public vars object.
A Cloudflare API token is not an OpenAI API key. The Worker code in this project
calls the OpenAI API and requires an OpenAI API key.

4. WORKER URL
script.js is already configured to use:
https://loreal-smart-routine.vm9351485.workers.dev/

If your Worker URL changes, update WORKER_URL at the top of script.js.

5. RUN THE WEBSITE
Run the site through your class Codespace / preview server so fetch("products.json")
works. Do not simply double-click index.html if the browser blocks local file requests.

6. TEST
- Choose a category and search for a product.
- Click product cards to select and unselect them.
- Remove a selected product or click Clear all.
- Refresh the page; selected products should remain.
- Click Generate my routine.
- Ask a follow-up question in the chat.

7. IMPORTANT
The chat history is kept in memory while the page is open. Selected products are
saved in localStorage. Clearing the chat clears the current conversation.
The optional RTL layout can be previewed from the browser console with:
document.body.dir = "rtl"

This starter does not include web search. Complete and test the core project first.