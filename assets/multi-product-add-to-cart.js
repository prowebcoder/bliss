class MultiProductRefills {
  constructor(container) {
    this.container = container;

    this.products = container.querySelectorAll(
      '.multi-product-atc__product'
    );

    this.bindEvents();
  }

  bindEvents() {
    this.products.forEach((product) => {

      product
        .querySelectorAll('.multi-product-atc__variant-option')
        .forEach((select) => {
          select.addEventListener('change', () => {
            this.updateVariant(product);
          });
        });

      product
        .querySelectorAll('[data-quantity-action]')
        .forEach((button) => {
          button.addEventListener('click', () => {
            const input = product.querySelector(
              '.multi-product-atc__qty-input'
            );

            if (!input) return;

            let quantity = Number(input.value || 1);

            if (button.dataset.quantityAction === 'increase') {
              quantity++;
            } else {
              quantity = Math.max(1, quantity - 1);
            }

            input.value = quantity;
          });
        });

      const addButton = product.querySelector(
        '[data-multi-product-add]'
      );

      if (addButton) {
        addButton.addEventListener('click', () => {
          this.addToCart(product, addButton);
        });
      }
    });
  }

  async updateVariant(product) {
    const selects = product.querySelectorAll(
      '.multi-product-atc__variant-option'
    );

    const optionValues = Array.from(selects).map(
      (select) => select.value
    );

    const handle = product.dataset.productHandle;

    if (!handle) return;

    try {
      const response = await fetch(
        `${window.Shopify.routes.root}products/${handle}.js`
      );

      if (!response.ok) {
        throw new Error('Unable to load product.');
      }

      const productData = await response.json();

      const variant = productData.variants.find((variant) => {
        return variant.options.every((option, index) => {
          return option === optionValues[index];
        });
      });

      if (!variant) return;

      const variantInput = product.querySelector(
        '.multi-product-atc__variant-id'
      );

      if (variantInput) {
        variantInput.value = variant.id;
      }

      const priceElement = product.querySelector(
        '.multi-product-atc__price-value'
      );

      if (priceElement) {
        priceElement.textContent = this.formatMoney(variant.price);
      }

    } catch (error) {
      console.error('Variant update failed:', error);
    }
  }

  async addToCart(product, button) {
    const variantInput = product.querySelector(
      '.multi-product-atc__variant-id'
    );

    const errorElement = product.querySelector(
      '[data-multi-product-error]'
    );

    if (!variantInput) return;

    const quantityInput = product.querySelector(
      '.multi-product-atc__qty-input'
    );

    const quantity = quantityInput
      ? Math.max(1, Number(quantityInput.value || 1))
      : 1;

    this.hideError(errorElement);
    this.setButtonState(button, 'loading');

    try {
      const response = await fetch(
        `${window.Shopify.routes.root}cart/add.js`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            items: [
              {
                id: Number(variantInput.value),
                quantity: quantity
              }
            ],
            sections: [
              'cart-drawer',
              'cart-icon-bubble',
              'cart-live-region-text'
            ],
            sections_url: window.location.pathname
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.description ||
          data.message ||
          'Unable to add this refill to the cart.'
        );
      }

      this.refreshCart(data);
      this.setButtonState(button, 'added');

    } catch (error) {
      console.error('Refill add to cart error:', error);

      this.showError(
        errorElement,
        error.message || 'Something went wrong. Please try again.'
      );

      this.setButtonState(button, 'idle');
    }
  }

  refreshCart(data) {
    if (data.sections && data.sections['cart-drawer']) {
      const cartDrawer = document.querySelector('cart-drawer');

      if (cartDrawer) {
        const doc = new DOMParser().parseFromString(
          data.sections['cart-drawer'],
          'text/html'
        );

        const newDrawer = doc.querySelector('cart-drawer');

        if (newDrawer) {
          cartDrawer.innerHTML = newDrawer.innerHTML;
          cartDrawer.classList.remove('is-empty');
        }
      }
    }

    if (data.sections && data.sections['cart-icon-bubble']) {
      const bubble = document.querySelector('#cart-icon-bubble');

      const doc = new DOMParser().parseFromString(
        data.sections['cart-icon-bubble'],
        'text/html'
      );

      const newBubble = doc.querySelector('#cart-icon-bubble');

      if (bubble && newBubble) {
        bubble.innerHTML = newBubble.innerHTML;
      }
    }

    const drawer = document.querySelector('cart-drawer');

    if (drawer) {
      if (typeof drawer.open === 'function') {
        drawer.open();
      } else {
        drawer.classList.remove('is-empty');
      }
    } else {
      window.location.href = `${window.Shopify.routes.root}cart`;
    }
  }

  setButtonState(button, state) {
    const label = button.querySelector(
      '[data-multi-product-add-label]'
    );

    if (!label) return;

    clearTimeout(button._resetTimer);

    if (state === 'loading') {
      button.disabled = true;
      label.textContent = 'Adding...';
      return;
    }

    button.disabled = false;

    if (state === 'added') {
      label.textContent = 'Added to cart';

      button._resetTimer = setTimeout(() => {
        label.textContent = 'Add to cart';
      }, 2000);

      return;
    }

    label.textContent = 'Add to cart';
  }

  showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
  }

  hideError(element) {
    if (!element) return;
    element.classList.add('hidden');
    element.textContent = '';
  }

  formatMoney(cents) {
    if (
      window.Shopify &&
      typeof Shopify.formatMoney === 'function'
    ) {
      return Shopify.formatMoney(
        cents,
        window.theme?.moneyFormat || '${{amount}}'
      );
    }

    return (Number(cents) / 100).toFixed(2);
  }
}


class MultiProductQuickView {
  constructor(container) {
    this.container = container;

    this.root = container.querySelector(
      '[data-multi-product-modal-root]'
    );

    this.content = container.querySelector(
      '[data-multi-product-modal-content]'
    );

    this.viewButtons = container.querySelectorAll(
      '[data-multi-product-view]'
    );

    if (!this.root || !this.content) return;

    this.bindEvents();
  }

  bindEvents() {
    this.viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.open(button.dataset.multiProductView);
      });
    });

    this.container
      .querySelectorAll('[data-multi-product-modal-close]')
      .forEach((element) => {
        element.addEventListener('click', () => this.close());
      });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.close();
    });
  }

  open(productId) {
    const template = this.container.querySelector(
      `[data-multi-product-modal="${productId}"]`
    );

    if (!template) return;

    this.content.innerHTML = '';
    this.content.appendChild(template.content.cloneNode(true));

    this.root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.root.classList.add('hidden');
    this.content.innerHTML = '';
    document.body.style.overflow = '';
  }
}


function initMultiProductATC() {
  document
    .querySelectorAll('.multi-product-atc')
    .forEach((container) => {
      if (container.dataset.initialized === 'true') return;

      container.dataset.initialized = 'true';

      new MultiProductRefills(container);
      new MultiProductQuickView(container);
    });
}

document.addEventListener('DOMContentLoaded', initMultiProductATC);
document.addEventListener('shopify:section:load', initMultiProductATC);