
// L'Oréal Smart Routine Builder
// Updated to work with the Cloudflare Worker and web search.

const WORKER_URL = "https://loreal-smart-routine.vm9351485.workers.dev/";

// Get website elements
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const productStatus = document.getElementById("productStatus");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearSelectedButton = document.getElementById("clearSelected");
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const clearChatButton = document.getElementById("clearChat");

let allProducts = [];
let selectedProducts = [];
let conversation = [];
let isSending = false;

// Escape text before adding product information to HTML.
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

// Load products from products.json.
async function loadProducts() {
  try {
    const response = await fetch("products.json");

    if (!response.ok) {
      throw new Error("Could not load products.json.");
    }

    const data = await response.json();

    if (!Array.isArray(data.products)) {
      throw new Error("Your products.json file needs a products array.");
    }

    allProducts = data.products;

    restoreSelectedProducts();
    displayProducts();
    displaySelectedProducts();

    productStatus.textContent =
      `${allProducts.length} products available.`;

  } catch (error) {
    productStatus.textContent = error.message;
    productsContainer.textContent =
      "Unable to load products. Please check products.json.";
  }
}

// Filter products by category and search.
function getFilteredProducts() {
  const category = categoryFilter.value;
  const searchText = productSearch.value.trim().toLowerCase();

  return allProducts.filter(product => {
    const matchesCategory =
      category === "all" ||
      String(product.category).toLowerCase() ===
      category.toLowerCase();

    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.description
    ].join(" ").toLowerCase();

    return matchesCategory &&
      searchableText.includes(searchText);
  });
}

// Display product cards.
function displayProducts() {
  const filteredProducts = getFilteredProducts();

  if (filteredProducts.length === 0) {
    productsContainer.innerHTML =
      '<p class="empty-state">No matching products found.</p>';
    return;
  }

  productsContainer.innerHTML = filteredProducts.map(product => {
    const isSelected = selectedProducts.some(
      item => String(item.id) === String(product.id)
    );

    return `
      <article
        class="product-card ${isSelected ? "selected" : ""}"
        data-product-id="${escapeHTML(product.id)}"
        tabindex="0"
        role="button"
        aria-pressed="${isSelected}">

        <img
          src="${escapeHTML(product.image || "")}"
          alt="${escapeHTML(product.name)}"
          onerror="this.style.display='none'">

        <div class="product-info">
          <h3>${escapeHTML(product.name)}</h3>

          <p class="product-brand">
            ${escapeHTML(product.brand)}
          </p>

          <p class="product-description">
            ${escapeHTML(product.description || "No description available.")}
          </p>

          <p class="select-hint">
            ${isSelected
              ? "✓ Selected — click to remove"
              : "+ Click to select"}
          </p>
        </div>
      </article>
    `;
  }).join("");
}

// Select or unselect a product.
function toggleProduct(productId) {
  const product = allProducts.find(
    item => String(item.id) === String(productId)
  );

  if (!product) return;

  const alreadySelected = selectedProducts.some(
    item => String(item.id) === String(productId)
  );

  if (alreadySelected) {
    selectedProducts = selectedProducts.filter(
      item => String(item.id) !== String(productId)
    );
  } else {
    selectedProducts.push(product);
  }

  saveSelectedProducts();
  displayProducts();
  displaySelectedProducts();
}

// Handle product card clicks and keyboard selection.
productsContainer.addEventListener("click", event => {
  const card = event.target.closest(".product-card");

  if (card) {
    toggleProduct(card.dataset.productId);
  }
});

productsContainer.addEventListener("keydown", event => {
  const card = event.target.closest(".product-card");

  if (
    card &&
    (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    toggleProduct(card.dataset.productId);
  }
});

// Display selected products.
function displaySelectedProducts() {
  selectedCount.textContent = selectedProducts.length;

  generateRoutineButton.disabled =
    selectedProducts.length === 0 || isSending;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="empty-state">Your selected products will appear here.</p>';
    return;
  }

  selectedProductsList.innerHTML =
    selectedProducts.map(product => `
      <div class="selected-item">

        <span>
          <strong>${escapeHTML(product.brand)}</strong>
          — ${escapeHTML(product.name)}
        </span>

        <button
          class="remove-button"
          type="button"
          data-remove-id="${escapeHTML(product.id)}"
          aria-label="Remove ${escapeHTML(product.name)}">
          ×
        </button>

      </div>
    `).join("");
}

// Remove an individual selected product.
selectedProductsList.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-id]");

  if (button) {
    toggleProduct(button.dataset.removeId);
  }
});

// Save selected products in localStorage.
function saveSelectedProducts() {
  localStorage.setItem(
    "lorealSelectedProducts",
    JSON.stringify(selectedProducts.map(product => product.id))
  );
}

// Restore selected products after refreshing the page.
function restoreSelectedProducts() {
  try {
    const savedIds = JSON.parse(
      localStorage.getItem("lorealSelectedProducts") || "[]"
    );

    if (!Array.isArray(savedIds)) {
      selectedProducts = [];
      return;
    }

    selectedProducts = allProducts.filter(product =>
      savedIds.some(id => String(id) === String(product.id))
    );

  } catch (error) {
    selectedProducts = [];
  }
}

// Display an AI message and make source URLs clickable.
function addChatMessage(role, content) {
  const message = document.createElement("div");

  message.className =
    `chat-message ${
      role === "user" ? "user-message" : "assistant-message"
    }`;

  const heading = document.createElement("strong");

  heading.textContent =
    role === "user" ? "You" : "Beauty Advisor";

  const paragraph = document.createElement("p");

  // Find URLs in the AI response.
  const urlPattern = /https?:\/\/[^\s<>"']+/g;

  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(content)) !== null) {
    const rawUrl = match[0];
    const cleanUrl = rawUrl.replace(/[.,;!?]+$/, "");

    const trailingText = rawUrl.slice(cleanUrl.length);

    paragraph.appendChild(
      document.createTextNode(
        content.slice(lastIndex, match.index)
      )
    );

    try {
      const parsedUrl = new URL(cleanUrl);

      if (
        parsedUrl.protocol === "http:" ||
        parsedUrl.protocol === "https:"
      ) {
        const link = document.createElement("a");

        link.href = parsedUrl.href;
        link.textContent = cleanUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        paragraph.appendChild(link);

      } else {
        paragraph.appendChild(
          document.createTextNode(cleanUrl)
        );
      }

    } catch {
      paragraph.appendChild(
        document.createTextNode(cleanUrl)
      );
    }

    if (trailingText) {
      paragraph.appendChild(
        document.createTextNode(trailingText)
      );
    }

    lastIndex = match.index + rawUrl.length;
  }

  paragraph.appendChild(
    document.createTextNode(content.slice(lastIndex))
  );

  paragraph.style.whiteSpace = "pre-wrap";

  message.append(heading, paragraph);

  chatWindow.appendChild(message);

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Send a message to the Cloudflare Worker.
async function askWorker(userMessage) {
  if (isSending || !userMessage.trim()) return;

  isSending = true;

  conversation.push({
    role: "user",
    content: userMessage
  });

  addChatMessage("user", userMessage);

  const loadingMessage = document.createElement("div");

  loadingMessage.className =
    "chat-message assistant-message";

  loadingMessage.textContent =
    "Your beauty advisor is thinking...";

  chatWindow.appendChild(loadingMessage);

  chatWindow.scrollTop = chatWindow.scrollHeight;

  generateRoutineButton.disabled = true;

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: conversation
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "The Worker request failed."
      );
    }

    // Read the response from the Worker.
    const answer =
      data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error("The AI returned an empty response.");
    }

    conversation.push({
      role: "assistant",
      content: answer
    });

    loadingMessage.remove();

    // Display the answer and clickable source links.
    addChatMessage("assistant", answer);

  } catch (error) {
    loadingMessage.remove();

    // Remove the unanswered message from conversation history.
    conversation.pop();

    addChatMessage(
      "assistant",
      `Sorry, I couldn't get a response. ${error.message}`
    );

  } finally {
    isSending = false;
    displaySelectedProducts();
  }
}

// Generate a routine using selected products.
generateRoutineButton.addEventListener("click", async () => {
  if (selectedProducts.length === 0 || isSending) return;

  const productDetails = selectedProducts.map(product => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description
  }));

  const requestText =
    "Please create a personalized beauty routine using these selected products. " +
    "Explain the order of use, when to use each product, and why each product fits. " +
    "Separate morning and evening steps when appropriate. " +
    "Do not invent product details. " +
    "Here are my selected products: " +
    JSON.stringify(productDetails);

  await askWorker(requestText);
});

// Send follow-up chat messages.
chatForm.addEventListener("submit", async event => {
  event.preventDefault();

  const message = userInput.value.trim();

  if (!message || isSending) return;

  userInput.value = "";

  await askWorker(message);
});

// Filter products when the category changes.
categoryFilter.addEventListener("change", displayProducts);

// Search products while typing.
productSearch.addEventListener("input", displayProducts);

// Clear all selected products.
clearSelectedButton.addEventListener("click", () => {
  selectedProducts = [];

  saveSelectedProducts();
  displayProducts();
  displaySelectedProducts();
});

// Clear conversation history.
clearChatButton.addEventListener("click", () => {
  if (isSending) return;

  conversation = [];
  chatWindow.innerHTML = "";

  addChatMessage(
    "assistant",
    "Chat cleared! Select products to generate a new routine, or ask me a beauty-related question."
  );
});

// Start the application.
loadProducts();
