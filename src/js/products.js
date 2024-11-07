import { gsap } from 'gsap';

export default class Products {
  constructor() {
    this.products = [...document.querySelectorAll('.products__item')];
    this.ctas = [...document.querySelectorAll('.products__cta')];
    this.cartButton = document.querySelector('.cart-button');

    this.cartButtonCoords = { x: 0, y: 0 };

    this.currentProduct = null;
    this.currentGallery = [];
    this.otherProducts = [];
    this.isTopRaw = false;

    this.init();
  }

  init() {
    this.setCartButtonCoords();

    this.ctas.forEach((cta, i) => {
      cta.addEventListener('click', () => {
        this.currentProduct = this.products[i];
        this.otherProducts = this.products.filter((prod, index) => index !== i );
        this.currentGallery = [...this.currentProduct.querySelectorAll('.products__gallery-item')];
        this.isTopRaw = window.innerWidth > 768 && i < 3;

        this.addToCart();
      })
    })
  }

  setCartButtonCoords() {
    const { x, y } = this.cartButton.getBoundingClientRect();
    this.cartButtonCoords = { x, y };
  }

  addToCart() {
    gsap.set(this.currentGallery, { transformOrigin: this.isTopRaw ? 'top right' : 'bottom left' });

    const { y, left, right, width, height } = this.currentGallery[0].getBoundingClientRect();

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(this.currentGallery, { scale: 1, autoAlpha: 1, y: 0, x: 0 });
      },
    });
    tl.addLabel('start');
  
    tl.to(this.otherProducts, {
      scale: 0.8, autoAlpha: 0.05, duration: 0.6, stagger: 0.04, ease: 'power2.out',
    }, 'start');
    tl.to(this.currentProduct, {
      scale: 1.05, duration: 0.6, ease: 'power2.out',
    }, 'start');
  
    tl.to(this.currentGallery, {
      keyframes: {
        '40%': {
          y: this.isTopRaw ? height * 1.5 : -height * 1.5, 
          scale: this.isTopRaw ? 0.8 : 0.5, 
          autoAlpha: 1,
        },
        '100%': {
          x: this.isTopRaw ? this.cartButtonCoords.x - right : this.cartButtonCoords.x - left,
          y: this.isTopRaw ? this.cartButtonCoords.y - y : this.cartButtonCoords.y - y - height,
          scale: 0,
          autoAlpha: 0,
        },
      },
      stagger: {
        from: 'end',
        each: 0.04,
      },
      duration: 1.8,
      ease: 'power2.inOut',
    }, 'start');
  
    tl.to([this.otherProducts, this.currentProduct], {
      scale: 1, autoAlpha: 1, duration: 0.8, stagger: 0.03, ease: 'power2.out',
    }, 'start+=1.6');
  }

  reset() {
    this.currentProduct = null;
    this.currentGallery = [];
    this.otherProducts = [];
  }
}