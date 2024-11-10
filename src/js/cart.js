import { gsap } from 'gsap';

class Cart {
  constructor() {
    this.cart = document.querySelector('.cart');
    this.cartItems = []

    this.cartButton = document.querySelector('.cart-button');
    this.cartButtonLabel = document.querySelector('.cart-button__label-wrap');
    this.cartButtonNumber = document.querySelector('.cart-button__number');
    this.cartButtonBg = document.querySelector('.cart-button__number-bg');
    this.cartClose = document.querySelector('.cart__inner-close');

    this.cartOpened = false;

    this.animatingElements = {
      bg: null,
      innerBg: null,
      close: null,
      items: null,
      total: null,
    }

    this.init();
  }

  init() {
    this.setupLabelAnimation();
    this.cartAnimationSetup();

    this.cartButton.addEventListener('click', () => {
      if (this.isAnimating) return;

      this.isAnimating = true;

      this.cartAnimationEnter().then(() => { 
        this.cartOpened = true;
        this.isAnimating = false;
      })
    })
    
    this.cartClose.addEventListener('click', () => {
      if (this.isAnimating) return;

      this.isAnimating = true;

      this.cartAnimationLeave().then(() => { 
        this.cartOpened = false;
        this.isAnimating = false;
      })
    })
  }

  setupLabelAnimation() {
    gsap.set([this.cartButtonNumber, this.cartButtonBg], { scale: 0 });
  }

  updateCartNumber() {
    this.cartButtonNumber.innerHTML = this.cartItems.length;
  }

  labelAnimation() {
    const tl = gsap.timeline();
    tl.addLabel('start');

    tl.to(this.cartButtonLabel, { x: -35, duration: 0.4, ease: 'power2.out' }, 'start');
    tl.to([this.cartButtonNumber, this.cartButtonBg], {
      scale: 1, stagger: 0.1, duration: 0.8, ease: 'elastic.out(1.3, 0.9)',
    }, 'start');
    return tl;
  }

  addItemToCart(el) {
    const { id, price, name, cover } = el.dataset;

    if (!this.cartItems[id]) this.cartItems[id] = { price, name, cover, quantity: 1 };
    else this.cartItems[id].quantity += 1;

    this.updateCartNumber();
  }

  cartAnimationSetup() {
    this.animatingElements.bg = this.cart.querySelector('.cart__bg');
    this.animatingElements.innerBg = this.cart.querySelector('.cart__inner-bg');
    this.animatingElements.close = this.cart.querySelector('.cart__inner-close');
    this.animatingElements.noProds = this.cart.querySelector('.cart-no-products');
    this.animatingElements.items = [...this.cart.querySelectorAll('.cart-item')];
    this.animatingElements.total = [...this.cart.querySelectorAll('.cart-total > *')];

    this.cartAnimationInit();
  }

  cartAnimationInit() { 
    gsap.set(this.cart, { xPercent: 100 });
    
    gsap.set([this.animatingElements.bg, this.animatingElements.innerBg], { xPercent: 110 });
    gsap.set(this.animatingElements.close, { x: 30, autoAlpha: 0 });
    if (this.animatingElements.items) gsap.set(this.animatingElements.items, { x: 30, autoAlpha: 0 });
    gsap.set(this.animatingElements.total, { scale: 0.9, autoAlpha: 0 });
  };
  
  cartAnimationEnter() {
    this.animatingElements.items = [...this.cart.querySelectorAll('.cart-item')];
    
    this.cartAnimationInit();
    
    const tl = gsap.timeline({
      onStart: () => gsap.set(this.cart, { xPercent: 0 })
    });
    tl.addLabel('start');

    tl.to([this.animatingElements.bg, this.animatingElements.innerBg], {
      xPercent: 0, stagger: 0.1, duration: 2.2, ease: 'expo.inOut',
    }, 'start');

    tl.to(this.animatingElements.close, {
      x: 0, autoAlpha: 1, stagger: 0.1, duration: 1, ease: 'power2.out',
    }, 'start+=1.3');
  
    if (this.animatingElements.items) {
      tl.to(this.animatingElements.items, {
        x: 0, autoAlpha: 1, stagger: 0.1, duration: 1, ease: 'power2.out',
      }, 'start+=1.4');
    }
    if (this.animatingElements.noProds) {
      tl.to(this.animatingElements.noProds, {
        x: 0, autoAlpha: 1, stagger: 0.1, duration: 1, ease: 'power2.out',
      }, 'start+=1.4');
    }
  
    tl.to(this.animatingElements.total, {
      scale: 1, autoAlpha: 1, stagger: 0.1, duration: 1, ease: 'power2.out',
    }, 'start+=1.6');

    return tl;
  };
  
  cartAnimationLeave() {
    const tl = gsap.timeline({
      onComplete: () => gsap.set(this.cart, { xPercent: 100 })
    });
    tl.addLabel('start');

    tl.to([this.animatingElements.bg, this.animatingElements.innerBg], {
      xPercent: 110, stagger: 0.1, duration: 1.5, ease: 'expo.inOut',
    }, 'start');

    if (this.animatingElements.items) {
      tl.to(this.animatingElements.items, {
        x: 30, autoAlpha: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out',
      }, 'start');
    }
    if (this.animatingElements.noProds) {
      tl.to(this.animatingElements.noProds, {
        x: 30, autoAlpha: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out',
      }, 'start');
    }

    tl.to(this.animatingElements.close, {
      x: 30, autoAlpha: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out',
    }, 'start');

    tl.to(this.animatingElements.total, {
      scale: 0.9, autoAlpha: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out',
    }, 'start');
    return tl;
  };
}

export default new Cart();