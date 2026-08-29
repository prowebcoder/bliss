class MultiProductAddToCart {
  constructor(container) {
    this.container = container;

    this.currentVariantId = Number(
      container.dataset.currentVariantId
    );

    this.currentQuantity = Number(
      container.dataset.currentQuantity || 1
    );

    this.checkboxes = container.querySelectorAll(
      '.multi-product-atc__check'
    );

    this.products = container.querySelectorAll(
      '.multi-product-atc__product'
    );

    this.submitButton = container.querySelector(
      '[data-multi-product-submit]'
    );

    this.totalElement = container.querySelector(
      '[data-multi-product-total]'
    );

    this.errorElement = container.querySelector(
      '[data-multi-product-error]'
    );

    this.spinner = container.querySelector(
      '[data-multi-product-spinner]'
    );

    this.bindEvents();

    this.updateTotal();
  }

  bindEvents() {

    this.checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.updateProductState(checkbox);
        this.updateTotal();
      });
    });

    this.products.forEach((product) => {

      const selects = product.querySelectorAll(
        '.multi-product-atc__variant-option'
      );

      selects.forEach((select) => {
        select.addEventListener('change', () => {
          this.updateVariant(product);
          this.updateTotal();
        });
      });

      const quantityButtons = product.querySelectorAll(
        '[data-quantity-action]'
      );

      quantityButtons.forEach((button) => {

        button.addEventListener('click', () => {

          const input = product.querySelector(
            '.multi-product-atc__qty-input'
          );

          let quantity = Number(input.value || 1);

          if (
            button.dataset.quantityAction === 'increase'
          ) {
            quantity++;
          } else {
            quantity = Math.max(1, quantity - 1);
          }

          input.value = quantity;

          this.updateTotal();
        });

      });

    });

    if (this.submitButton) {
      this.submitButton.addEventListener(
        'click',
        () => this.addToCart()
      );
    }
  }

  updateProductState(checkbox) {

    const product = checkbox.closest(
      '.multi-product-atc__product'
    );

    if (!product) return;

    product.classList.toggle(
      'is-selected',
      checkbox.checked
    );
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

      const variant = productData.variants.find(
        (variant) => {

          return variant.options.every(
            (option, index) => {
              return option === optionValues[index];
            }
          );

        }
      );

      if (!variant) {
        return;
      }

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
        priceElement.textContent =
          this.formatMoney(variant.price);
      }

    } catch (error) {
      console.error(
        'Variant update failed:',
        error
      );
    }
  }

  getSelectedProducts() {

    const selected = [];

    this.products.forEach((product) => {

      const checkbox = product.querySelector(
        '.multi-product-atc__check'
      );

      if (!checkbox || !checkbox.checked) {
        return;
      }

      const variantInput = product.querySelector(
        '.multi-product-atc__variant-id'
      );

      if (!variantInput) {
        return;
      }

      const quantityInput = product.querySelector(
        '.multi-product-atc__qty-input'
      );

      const quantity = quantityInput
        ? Math.max(1, Number(quantityInput.value || 1))
        : 1;

      selected.push({
        id: Number(variantInput.value),
        quantity: quantity
      });

    });

    return selected;
  }

  updateTotal() {

    let total = 0;

    const selectedProducts =
      this.getSelectedProducts();

    selectedProducts.forEach((item) => {

      const product = this.findProductByVariant(
        item.id
      );

      if (!product) return;

      const priceElement = product.querySelector(
        '.multi-product-atc__price-value'
      );

      if (!priceElement) return;

    });

    /*
      We get the prices directly from the
      product JSON when needed below.
    */

    this.calculateTotal(selectedProducts);
  }

  async calculateTotal(items) {

    let total = 0;

    try {

      for (const item of items) {

        const product = Array.from(
          this.products
        ).find((element) => {

          const input = element.querySelector(
            '.multi-product-atc__variant-id'
          );

          return (
            input &&
            Number(input.value) === Number(item.id)
          );

        });

        if (!product) continue;

        const priceElement = product.querySelector(
          '.multi-product-atc__price-value'
        );

        if (!priceElement) continue;

        const price = await this.getVariantPrice(
          product.dataset.productHandle,
          item.id
        );

        total += price * item.quantity;
      }

      /*
        Current product is always included.
      */
      total += await this.getCurrentProductPrice();

      if (this.totalElement) {
        this.totalElement.textContent =
          this.formatMoney(total);
      }

    } catch (error) {
      console.error(
        'Unable to calculate total:',
        error
      );
    }
  }

  async getVariantPrice(handle, variantId) {

    const response = await fetch(
      `${window.Shopify.routes.root}products/${handle}.js`
    );

    const product = await response.json();

    const variant = product.variants.find(
      (variant) =>
        Number(variant.id) === Number(variantId)
    );

    return variant
      ? Number(variant.price)
      : 0;
  }

  async getCurrentProductPrice() {

    const response = await fetch(
      `${window.Shopify.routes.root}products/${window.location.pathname.split('/products/')[1].split('?')[0]}.js`
    );

    if (!response.ok) {
      return 0;
    }

    const product = await response.json();

    const variant = product.variants.find(
      (variant) =>
        Number(variant.id) ===
        Number(this.currentVariantId)
    );

    return variant
      ? Number(variant.price)
      : 0;
  }

  findProductByVariant(variantId) {

    return Array.from(
      this.products
    ).find((product) => {

      const input = product.querySelector(
        '.multi-product-atc__variant-id'
      );

      return (
        input &&
        Number(input.value) === Number(variantId)
      );

    });
  }

  async addToCart() {

    this.hideError();

    const selectedProducts =
      this.getSelectedProducts();

    const items = [
      {
        id: this.currentVariantId,
        quantity: this.currentQuantity
      },
      ...selectedProducts
    ];

    this.setLoading(true);

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
            items: items,

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
          'Unable to add products to cart.'
        );
      }

      this.refreshCart(data);

    } catch (error) {

      console.error(
        'Multi product cart error:',
        error
      );

      this.showError(
        error.message ||
        'Something went wrong. Please try again.'
      );

    } finally {

      this.setLoading(false);

    }
  }

  refreshCart(data) {

    /*
      Dawn's cart drawer can be refreshed using
      the HTML returned by Shopify's bundled
      section rendering.
    */

    if (
      data.sections &&
      data.sections['cart-drawer']
    ) {

      const cartDrawer =
        document.querySelector('cart-drawer');

      if (cartDrawer) {

        const parser =
          new DOMParser();

        const doc =
          parser.parseFromString(
            data.sections['cart-drawer'],
            'text/html'
          );

        const newDrawer =
          doc.querySelector('cart-drawer');

        if (newDrawer) {

          cartDrawer.innerHTML =
            newDrawer.innerHTML;

          cartDrawer.classList.remove(
            'is-empty'
          );
        }
      }
    }

    if (
      data.sections &&
      data.sections['cart-icon-bubble']
    ) {

      const bubble =
        document.querySelector(
          '#cart-icon-bubble'
        );

      const parser =
        new DOMParser();

      const doc =
        parser.parseFromString(
          data.sections['cart-icon-bubble'],
          'text/html'
        );

      const newBubble =
        doc.querySelector(
          '#cart-icon-bubble'
        );

      if (bubble && newBubble) {
        bubble.innerHTML =
          newBubble.innerHTML;
      }
    }

    /*
      Open Dawn cart drawer.
    */
    const drawer =
      document.querySelector('cart-drawer');

    if (drawer) {

      if (typeof drawer.open === 'function') {
        drawer.open();
      } else {
        drawer.classList.remove('is-empty');
      }

    } else {

      window.location.href =
        `${window.Shopify.routes.root}cart`;

    }
  }

  setLoading(loading) {

    if (!this.submitButton) return;

    this.submitButton.disabled = loading;

    if (this.spinner) {
      this.spinner.classList.toggle(
        'hidden',
        !loading
      );
    }
  }

  showError(message) {

    if (!this.errorElement) return;

    this.errorElement.textContent =
      message;

    this.errorElement.classList.remove(
      'hidden'
    );
  }

  hideError() {

    if (!this.errorElement) return;

    this.errorElement.classList.add(
      'hidden'
    );

    this.errorElement.textContent = '';
  }

  formatMoney(cents) {

    if (
      window.Shopify &&
      typeof Shopify.formatMoney === 'function'
    ) {
      return Shopify.formatMoney(
        cents,
        window.theme?.moneyFormat ||
        '${{amount}}'
      );
    }

    return (
      Number(cents) / 100
    ).toFixed(2);
  }
}


function initMultiProductATC() {

  document
    .querySelectorAll('.multi-product-atc')
    .forEach((container) => {

      if (
        container.dataset.initialized === 'true'
      ) {
        return;
      }

      container.dataset.initialized = 'true';

      new MultiProductAddToCart(container);

    });
}


document.addEventListener(
  'DOMContentLoaded',
  initMultiProductATC
);

document.addEventListener(
  'shopify:section:load',
  initMultiProductATC
);