const slides = [...document.querySelectorAll(".hero-slide")];
const dots = [...document.querySelectorAll(".slider-dot")];
const hero = document.querySelector(".hero");

let activeSlide = 0;
let slideTimer;

const showSlide = (index) => {
  activeSlide = (index + slides.length) % slides.length;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeSlide);
  });

  dots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeSlide;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", isActive ? "true" : "false");
  });
};

const startSlider = () => {
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 5000);
};

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    showSlide(index);
    startSlider();
  });
});

hero?.addEventListener("mouseenter", () => window.clearInterval(slideTimer));
hero?.addEventListener("mouseleave", startSlider);
hero?.addEventListener("focusin", () => window.clearInterval(slideTimer));
hero?.addEventListener("focusout", startSlider);

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

const closeMenu = () => {
  menuToggle?.setAttribute("aria-expanded", "false");
  navLinks?.classList.remove("is-open");
  document.body.classList.remove("menu-open");
};

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  navLinks?.classList.toggle("is-open", willOpen);
  document.body.classList.toggle("menu-open", willOpen);
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 920) {
    closeMenu();
  }
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

const cart = {
  count: 0,
  total: 0,
  items: {}
};

const cartToggle = document.querySelector(".cart-toggle");
const cartCount = document.querySelector(".cart-count");
const cartPanel = document.querySelector(".cart-panel");
const cartItems = document.querySelector(".cart-items");
const cartEmpty = document.querySelector(".cart-empty");
const cartSubtotal = document.querySelector(".cart-subtotal");
const cartCheckoutButton = document.querySelector(".cart-checkout-button");
const cartStatus = document.querySelector(".cart-status");
const checkoutSessionEndpoint = "/create-checkout-session";
const singaporeShippingRateId = "shr_1TfuClHzqKH9HNrFEL0hpbVu";
const formatPrice = (value) => `SGD${value.toFixed(2)}`;

const hasPlaceholderStripeKeys = () =>
  Object.values(cart.items).some((item) => item.priceId.includes("replace_me"));

const setCartStatus = (message) => {
  if (cartStatus) {
    cartStatus.textContent = message;
  }
};

const openCart = () => {
  cartPanel?.classList.add("is-open");
  cartPanel?.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  setCartStatus("");
};

const closeCart = () => {
  cartPanel?.classList.remove("is-open");
  cartPanel?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
};

const renderCart = () => {
  if (cartCount) {
    cartCount.textContent = String(cart.count);
  }

  if (cartSubtotal) {
    cartSubtotal.textContent = formatPrice(cart.total);
  }

  if (cartEmpty) {
    cartEmpty.classList.toggle("is-visible", cart.count === 0);
  }

  if (cartCheckoutButton) {
    cartCheckoutButton.disabled = cart.count === 0;
  }

  if (!cartItems) {
    return;
  }

  cartItems.innerHTML = "";

  Object.values(cart.items).forEach((item) => {
    const itemElement = document.createElement("article");
    itemElement.className = "cart-item";
    itemElement.innerHTML = `
      <div class="cart-item-header">
        <h3>${item.name}</h3>
        <span class="cart-item-quantity">x ${item.quantity}</span>
      </div>
      <div class="cart-item-details">
        <div class="cart-item-row">
          <span>Unit price</span>
          <strong>${formatPrice(item.price)}</strong>
        </div>
        <div class="cart-item-row">
          <span>Total</span>
          <strong>${formatPrice(item.price * item.quantity)}</strong>
        </div>
      </div>
    `;
    cartItems.appendChild(itemElement);
  });
};

const getCheckoutLineItems = () => {
  return Object.values(cart.items).map((item) => ({
    price: item.priceId,
    quantity: item.quantity,
    productId: item.productId,
    name: item.name
  }));
};

document.querySelectorAll(".product-card").forEach((card) => {
  const buyButton = card.querySelector(".buy-button");
  const quantitySelect = card.querySelector(".quantity-select");
  const name = card.dataset.productName || "Black Ember Coffee";
  const price = Number(card.dataset.productPrice || 0);
  const productId = card.dataset.stripeProductId || "";
  const priceId = card.dataset.stripePriceId || "";

  buyButton?.addEventListener("click", () => {
    const quantity = Number(quantitySelect?.value || 1);
    cart.count += quantity;
    cart.total += price * quantity;
    cart.items[name] = {
      name,
      price,
      productId,
      priceId,
      quantity: (cart.items[name]?.quantity || 0) + quantity
    };
    renderCart();
  });
});

cartToggle?.addEventListener("click", () => {
  openCart();
});

document.querySelectorAll("[data-cart-close]").forEach((button) => {
  button.addEventListener("click", closeCart);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
  }
});

cartCheckoutButton?.addEventListener("click", async () => {
  if (cart.count === 0) {
    setCartStatus("Your cart is empty. Add a product before checkout.");
    return;
  }

  if (hasPlaceholderStripeKeys()) {
    setCartStatus("Stripe price keys are not ready yet. Replace the placeholder data-stripe-price-id values first.");
    return;
  }

  setCartStatus("Opening Stripe checkout...");
  cartCheckoutButton.disabled = true;

  try {
    const response = await fetch(checkoutSessionEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        lineItems: getCheckoutLineItems()
      })
    });

    const session = await response.json();

    if (!response.ok) {
      throw new Error(session.error || "Checkout session request failed.");
    }

    if (!session.url) {
      throw new Error("Checkout session URL is missing.");
    }

    window.location.href = session.url;
  } catch (error) {
    setCartStatus(error.message || "Checkout is not connected yet. Add your Stripe keys and backend session endpoint first.");
    cartCheckoutButton.disabled = false;
  }
});

renderCart();
showSlide(0);
startSlider();
