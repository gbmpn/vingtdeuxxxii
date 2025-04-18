import '../scss/reset.scss';
import '../scss/base.scss';
import '../scss/globals.scss';
import '../scss/products.scss';
import '../scss/cart.scss';

import { preloadImages } from './utils';
import Products from './products';
import Slider from './slider';

import Draggable from 'gsap/Draggable';
import InertiaPlugin from 'gsap/InertiaPlugin';

import Swiper from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

gsap.registerPlugin(Draggable, InertiaPlugin);

window.addEventListener('load', async () => {
  new Slider();

  const fetchCollectionsAndProducts = async () => {
    const endpoint = `https://ri1ysg-yt.myshopify.com/api/2023-07/graphql.json`;
    const storefrontAccessToken = "5a1b261e3850235223c65a48cb1b3be3"; // Replace with your token

    const query = `
{
  collections(first: 5) {
    edges {
      node {
        id
        title
        products(first: 10) {
          edges {
            node {
              id
              title
              description
              vendor
              productType
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {  
                edges {
                  node {
                    src
                  }
                }
              }
              availableForSale
            }
          }
        }
        metafield(namespace: "custom", key: "banner") {
          reference {
            ... on MediaImage {
              image {
                url
              }
            }
          }
        }
      }
    }
  }
}
`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (response.ok) {
        populateCollections(data.data.collections.edges);
        new Products();
        // Initialize Swiper for all galleries after content is populated
        initSwipers();
        modalZoom();
      } else {
        console.error("Error fetching data:", data.errors);
      }
    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  };

  const populateCollections = (collections) => {
    const contentWrapper = document.querySelector('.content');

    collections.forEach((collection) => {
      const { title, products, metafield } = collection.node;
      const bannerImageSrc = metafield?.reference?.image?.url || "./images/cover.png";

      // Collection Title
      const heading = document.createElement("div");
      heading.classList.add("heading");

      
      const collectionTitle = document.createElement("h2");
      collectionTitle.textContent = title;
      heading.appendChild(collectionTitle);
      contentWrapper.appendChild(heading);

      const productsWrapper = document.createElement("div");
      productsWrapper.classList.add("products");

      const productList = document.createElement("ul");
      productList.classList.add("products-list", "products__list");

      products.edges.forEach((product) => {
        const { id, title, description, vendor, productType, tags, priceRange, images, availableForSale } = product.node;

        const productItem = document.createElement("li");
        productItem.classList.add("products__item");
        productItem.setAttribute("data-id", id);
        productItem.setAttribute("data-price", priceRange.minVariantPrice.amount);
        productItem.setAttribute("data-name", title);
        productItem.setAttribute("data-cover", images.edges[0]?.node.src);
        productItem.addEventListener("click", () => {
        //
        //   alert("Product Clicked!");
        });

        // Product Image Section
        const productImages = document.createElement("div");
        productImages.classList.add("products__images");

        const mainImage = document.createElement("img");
        mainImage.classList.add("products__main-image");
        mainImage.setAttribute("src", images.edges[0]?.node.src || "./images/default.jpg");
        mainImage.setAttribute("alt", title);

        // Product Horizontal Gallery using Swiper.js
        const swiperContainer = document.createElement("div");
        swiperContainer.classList.add("swiper-container", "products__gallery-swiper");

        const swiperWrapper = document.createElement("div");
        swiperWrapper.classList.add("swiper-wrapper");

        // Loop through all images to create slides
        images.edges.forEach((imgEdge) => {
          const slide = document.createElement("div");
          slide.classList.add("swiper-slide");
          const img = document.createElement("img");
          img.classList.add("products__gallery-item");
          img.setAttribute("src", imgEdge.node.src);
          img.setAttribute("alt", `${title} gallery`);
          slide.appendChild(img);
          swiperWrapper.appendChild(slide);
        });

        swiperContainer.appendChild(swiperWrapper);

        // Add pagination and navigation controls
        const pagination = document.createElement("div");
        pagination.classList.add("swiper-pagination");
        swiperContainer.appendChild(pagination);

        const btnNext = document.createElement("div");
        btnNext.classList.add("swiper-button-next");
        swiperContainer.appendChild(btnNext);

        const btnPrev = document.createElement("div");
        btnPrev.classList.add("swiper-button-prev");
        swiperContainer.appendChild(btnPrev);

        // Append the main image and the Swiper gallery
        productImages.appendChild(mainImage);
        productImages.appendChild(swiperContainer);

        // Product Info
        const productTitle = document.createElement("h3");
        productTitle.textContent = title;

        // Price Tag visible on first level
        const productPrice = document.createElement("p");
        productPrice.classList.add("products__price");
        productPrice.textContent = `${priceRange.minVariantPrice.amount}€`;

        const productDescription = document.createElement("p");
        productDescription.classList.add("products__description");
        productDescription.textContent = description || "No description available.";

        const productMeta = document.createElement("p");
        productMeta.classList.add("products__meta");
        productMeta.textContent = `Brand: ${vendor} | Type: ${productType}`;

        // const productTags = document.createElement("p");
        // productTags.classList.add("products__tags");
        // productTags.textContent = `Tags: ${tags.join(", ")}`;

        // Bottom Navigation
        const navBottom = document.createElement("nav");
        navBottom.classList.add("nav-bottom");

        const soldOutLabel = document.createElement("span");
        soldOutLabel.classList.add("available");
        soldOutLabel.textContent = availableForSale ? "Available" : "Sold Out";

        const addToCartButton = document.createElement("button");
        addToCartButton.type = "button";
        addToCartButton.classList.add("products__cta", "button");
        addToCartButton.textContent = "Add to cart";

        navBottom.appendChild(soldOutLabel);
        navBottom.appendChild(addToCartButton);

        // Append elements to product item
        productItem.appendChild(productTitle);
        productItem.appendChild(productPrice); // Price tag visible immediately below the title
        productItem.appendChild(productDescription);
        productItem.appendChild(productMeta);
        // productItem.appendChild(productTags);
        productItem.appendChild(productImages);
        productItem.appendChild(navBottom);

        productList.appendChild(productItem);
      });

      productsWrapper.appendChild(productList);
      contentWrapper.appendChild(productsWrapper);
    });
  };

  // Initialize all Swiper galleries after products are added
  const initSwipers = () => {
    const swiperContainers = document.querySelectorAll('.products__gallery-swiper');
    swiperContainers.forEach((container) => {
      new Swiper(container, {
        slidesPerView: 1,
        spaceBetween: 10,
        pagination: {
          el: container.querySelector('.swiper-pagination'),
          clickable: true,
        },
        navigation: {
          nextEl: container.querySelector('.swiper-button-next'),
          prevEl: container.querySelector('.swiper-button-prev'),
        },
      });
    });
  };

  fetchCollectionsAndProducts();

  const images = [...document.querySelectorAll('img')];
  await preloadImages(images).then(() => {
    setTimeout(() => {
      document.body.classList.remove('loading');
    }, 1200);
  });

  const navTrigger = document.querySelector('.navTrigger');
  const navContainer = document.querySelector('.navigation');

  navTrigger.addEventListener('click', () => {
    navContainer.classList.toggle('is-open');
  });

  Draggable.create(navContainer, {
    bounds: { minX: 0, maxX: window.innerWidth - navContainer.offsetWidth },
    inertia: true,
    throwProps: true,
    edgeResistance: 0.8,
  });

  const modalZoom = () => {
    const products__items = document.querySelectorAll('.products__item');
    const modal = document.querySelector('.modal');
    const modalInner = document.querySelector('.modal__inner');
    const closeModal = document.querySelector('.modal__close');
    products__items.forEach((item) => {
      item.addEventListener('click', () => {

        modal.classList.add('is-open');
        modalInner.innerHTML = item.innerHTML;

        // initSwipers();

        console.log( item.innerHTML);
        // alert(`Product ID: ${item.getAttribute('data-id')}`);
      });

      closeModal.addEventListener('click', () => {
        modal.classList.remove('is-open');
        modalInner.innerHTML = '';
      });
      
    });
    
  }
});