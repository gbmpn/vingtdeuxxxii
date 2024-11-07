import '../scss/reset.scss';
import '../scss/base.scss';
import '../scss/globals.scss';
import '../scss/products.scss';
import '../scss/cart.scss';

import Products from './products';

window.addEventListener('load', () => {
  new Products();
  document.body.classList.remove('loading');
});