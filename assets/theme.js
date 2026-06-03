document.addEventListener('DOMContentLoaded', () => {
  // 1. Fechas dinámicas de envío (4 a 7 días hábiles)
  initShippingTimeline();

  // 2. Control de la galería de imágenes
  initProductGallery();

  // 3. Lógica Dinámica de Producto (Precios, Variantes, Formulario AJAX)
  initDynamicProductLogic();

  // 4. Acordeón de FAQ
  initFaqAccordion();

  // 5. Botón Sticky Add to Cart
  initStickyCart();

  // 6. Efecto 3D de inclinación en hover (Tilt Effect)
  init3DTilt();
});

// --- 1. Fechas Dinámicas de Envío ---
function initShippingTimeline() {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  const today = new Date();
  
  const orderReadyMin = new Date(today);
  orderReadyMin.setDate(today.getDate() + 1);
  const orderReadyMax = new Date(today);
  orderReadyMax.setDate(today.getDate() + 2);
  
  const deliveryMin = new Date(today);
  deliveryMin.setDate(today.getDate() + 4);
  const deliveryMax = new Date(today);
  deliveryMax.setDate(today.getDate() + 7);

  // Formateadores
  const formatDate = (date) => `${months[date.getMonth()]} ${date.getDate()}`;
  const formatRange = (dMin, dMax) => `${months[dMin.getMonth()]} ${dMin.getDate()} - ${months[dMax.getMonth()]} ${dMax.getDate()}`;

  // Actualizar en el DOM
  const orderEl = document.getElementById('shipping-order-date');
  const readyEl = document.getElementById('shipping-ready-date');
  const deliveryEl = document.getElementById('shipping-delivery-date');

  if (orderEl) orderEl.innerText = formatDate(today);
  if (readyEl) readyEl.innerText = `${formatDate(orderReadyMin)} - ${orderReadyMax.getDate()}`;
  if (deliveryEl) deliveryEl.innerText = `${formatDate(deliveryMin)} - ${deliveryMax.getDate()}`;
}

// --- 2. Galería de Imágenes ---
function initProductGallery() {
  const mainImg = document.getElementById('product-main-image');
  const thumbs = document.querySelectorAll('.thumbnail-item');

  if (!mainImg || thumbs.length === 0) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const newSrc = thumb.getAttribute('data-image-src');
      if (newSrc) {
        mainImg.setAttribute('src', newSrc);
      }
    });
  });
}

// --- 3. Lógica Dinámica de Producto ---
function initDynamicProductLogic() {
  let productData = null;
  const jsonEl = document.getElementById('product-json-data');
  if (jsonEl) {
    try {
      productData = JSON.parse(jsonEl.innerHTML);
    } catch(e) {
      console.error("Error parsing product JSON", e);
    }
  }

  const options = document.querySelectorAll('.offer-option');
  const priceDisplay = document.getElementById('product-current-price-display');
  const comparePriceDisplay = document.getElementById('product-compare-price-display');
  const stickyQtyText = document.getElementById('sticky-qty-text');
  const stickyPriceText = document.getElementById('sticky-price-text');
  const rawPriceEl = document.getElementById('product-current-price-display');
  const form = document.getElementById('landing-add-to-cart-form');
  
  if (options.length === 0) return;

  // Extraer precio base en centavos o número
  let basePrice = 3990; 
  if (rawPriceEl && rawPriceEl.getAttribute('data-raw-price')) {
    basePrice = parseInt(rawPriceEl.getAttribute('data-raw-price'), 10);
  } else if (productData) {
    basePrice = productData.price;
  }

  // Formateador de moneda (Pesos Colombianos - COP)
  const formatMoney = (cents) => {
    // Math.round(cents/100) convierte centavos a unidades, ej: 4500000 -> 45000
    return '$ ' + Math.round(cents / 100).toLocaleString('es-CO') + ' COP';
  };

  // Pre-calcular precios dinámicos para las 3 ofertas
  options.forEach(option => {
    const mult = parseInt(option.getAttribute('data-multiplier') || 1, 10);
    const disc = parseFloat(option.getAttribute('data-discount') || 1.0);
    
    const finalPriceCents = Math.round(basePrice * mult * disc);
    const comparePriceCents = basePrice * mult;

    const formattedPrice = formatMoney(finalPriceCents);
    const formattedCompare = formatMoney(comparePriceCents);

    const priceEl = option.querySelector(`.dynamic-price-${mult}x`);
    const compEl = option.querySelector(`.dynamic-compare-${mult}x`);
    
    if (priceEl) priceEl.innerText = formattedPrice;
    if (compEl) {
      if (disc < 1.0) compEl.innerText = formattedCompare;
      else compEl.innerText = "";
    }

    // Actualizar dataset para cuando se seleccione
    option.setAttribute('data-computed-price', formattedPrice);
    if (disc < 1.0) option.setAttribute('data-computed-compare', formattedCompare);
    else option.setAttribute('data-computed-compare', '');
  });

  // Manejar Click en Ofertas
  options.forEach(option => {
    option.addEventListener('click', (e) => {
      if (e.target.tagName === 'SELECT') return; // Ignorar si clickea el select

      options.forEach(o => o.classList.remove('active'));
      option.classList.add('active');

      const computedPrice = option.getAttribute('data-computed-price');
      const computedCompare = option.getAttribute('data-computed-compare');
      const label = option.querySelector('.offer-title').innerText;

      if (priceDisplay) priceDisplay.innerText = computedPrice;
      if (comparePriceDisplay) comparePriceDisplay.innerText = computedCompare;

      options.forEach(o => {
        const sel = o.querySelector('.offer-selectors');
        if (sel) sel.style.display = o.classList.contains('active') ? 'grid' : 'none';
      });

      if (stickyQtyText) stickyQtyText.innerText = `${label}`;
      if (stickyPriceText) stickyPriceText.innerText = computedPrice;
    });
  });

  // Forzar activación inicial de la oferta predeterminada (2x)
  const activeOption = document.querySelector('.offer-option.active') || options[0];
  if(activeOption) {
    activeOption.click();
  }

  // --- AJAX Add to Cart Logic ---
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const activeOffer = document.querySelector('.offer-option.active');
      if (!activeOffer) return;

      const qty = parseInt(activeOffer.getAttribute('data-quantity'), 10);
      const itemsToAdd = [];

      if (!productData || productData.variants.length === 1) {
        // Producto sin variantes complejas
        itemsToAdd.push({
          id: productData ? productData.variants[0].id : document.getElementById('main-product-variant-id').value,
          quantity: qty
        });
      } else {
        // Producto con variantes: recolectar los IDs según los <select>
        const selectsContainer = activeOffer.querySelector('.offer-selectors');
        
        for (let unit = 1; unit <= qty; unit++) {
          const unitSelects = selectsContainer.querySelectorAll(`select[data-unit="${unit}"]`);
          
          let selectedOptions = [];
          unitSelects.forEach(sel => {
            selectedOptions.push(sel.value);
          });

          // Encontrar variante que coincide
          const matchedVariant = productData.variants.find(v => {
            // Shopify variant options are v.option1, v.option2, v.option3
            const vOpts = [v.option1, v.option2, v.option3].filter(Boolean);
            return vOpts.every((opt, idx) => opt === selectedOptions[idx]);
          });

          if (matchedVariant) {
            itemsToAdd.push({ id: matchedVariant.id, quantity: 1 });
          } else {
            console.warn("Variante no encontrada para la unidad", unit, selectedOptions);
          }
        }
      }

      if (itemsToAdd.length === 0) {
        alert("Por favor selecciona opciones válidas.");
        return;
      }

      // Agrupar items idénticos (si eligió 2 unidades con exactamente el mismo color/versión)
      const groupedItems = {};
      itemsToAdd.forEach(item => {
        if(groupedItems[item.id]) groupedItems[item.id] += item.quantity;
        else groupedItems[item.id] = item.quantity;
      });

      const finalItemsArray = Object.keys(groupedItems).map(id => ({
        id: parseInt(id, 10),
        quantity: groupedItems[id]
      }));

      const btn = document.getElementById('main-add-to-cart-btn');
      const originalText = btn.innerText;
      btn.innerText = "Agregando...";
      btn.disabled = true;

      const addRoute = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ? window.Shopify.routes.root + 'cart/add.js' : '/cart/add.js';

      fetch(addRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: finalItemsArray })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('No se pudo agregar al carrito. Revisa la consola para más detalles.');
        }
        return response.json();
      })
      .then(data => {
        // Redirigir al carrito
        window.location.href = '/cart';
      })
      .catch((error) => {
        console.error('Error:', error);
        alert("Ocurrió un error al agregar el producto al carrito. Asegúrate de estar viendo una tienda real y que el producto tenga inventario.");
        btn.innerText = "Error";
        setTimeout(() => {
          btn.innerText = originalText;
          btn.disabled = false;
        }, 2000);
      });

    });
  }
}

// --- 4. Acordeón de FAQ ---
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });
}

// --- 5. Sticky Add to Cart ---
function initStickyCart() {
  const mainBtn = document.getElementById('main-add-to-cart-btn');
  const stickyBar = document.getElementById('sticky-add-to-cart-bar');

  if (!mainBtn || !stickyBar) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    });
  }, { root: null, threshold: 0 });

  observer.observe(mainBtn);

  const stickyBtn = document.getElementById('sticky-submit-btn');
  if (stickyBtn) {
    stickyBtn.addEventListener('click', () => {
      mainBtn.click();
    });
  }
}

// --- 6. Efecto de inclinación 3D ---
function init3DTilt() {
  const cards = document.querySelectorAll('.hover-3d');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((centerY - y) / centerY) * 8;
      const rotateY = ((x - centerX) / centerX) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
}
