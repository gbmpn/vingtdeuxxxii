import '../scss/reset.scss';
import '../scss/base.scss';
import '../scss/globals.scss';
import '../scss/products.scss';
import '../scss/cart.scss';

import { preloadImages } from './utils';
import Products from './products';
import Slider from './slider';

import Draggable from 'gsap/Draggable'
import InertiaPlugin from 'gsap/InertiaPlugin'
import { AlphaFormat } from 'three/src/constants.js';

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
          alert("Product Clicked!");
        });

        // Product Image Section
        const productImages = document.createElement("div");
        productImages.classList.add("products__images");

        const mainImage = document.createElement("img");
        mainImage.classList.add("products__main-image");
        mainImage.setAttribute("src", images.edges[0]?.node.src || "./images/default.jpg");
        mainImage.setAttribute("alt", title);

        const gallery = document.createElement("div");
        gallery.classList.add("products__gallery");

        images.edges.forEach((imgEdge, index) => {
          if (index > 0) {
            const galleryImage = document.createElement("img");
            galleryImage.classList.add("products__gallery-item");
            galleryImage.setAttribute("src", imgEdge.node.src);
            galleryImage.setAttribute("alt", `${title} gallery`);
            gallery.appendChild(galleryImage);
          }
        });

        productImages.appendChild(mainImage);
        productImages.appendChild(gallery);

        // Product Info
        const productTitle = document.createElement("h3");
        productTitle.textContent = title;

        const productDescription = document.createElement("p");
        productDescription.classList.add("products__description");
        productDescription.textContent = description || "No description available.";

        const productMeta = document.createElement("p");
        productMeta.classList.add("products__meta");
        productMeta.textContent = `Brand: ${vendor} | Type: ${productType}`;

        const productTags = document.createElement("p");
        productTags.classList.add("products__tags");
        productTags.textContent = `Tags: ${tags.join(", ")}`;

        // Bottom Navigation
        const navBottom = document.createElement("nav");
        navBottom.classList.add("nav-bottom");

        const soldOutLabel = document.createElement("span");
        soldOutLabel.classList.add("available");
        soldOutLabel.textContent = availableForSale ? "" : "Sold Out";

        const addToCartButton = document.createElement("button");
        addToCartButton.type = "button";
        addToCartButton.classList.add("products__cta", "button");
        addToCartButton.textContent = "Add to cart";

        navBottom.appendChild(soldOutLabel);
        navBottom.appendChild(addToCartButton);

        productItem.appendChild(productTitle);
        productItem.appendChild(productDescription);
        productItem.appendChild(productMeta);
        productItem.appendChild(productTags);
        productItem.appendChild(productImages);
        productItem.appendChild(navBottom);

        productList.appendChild(productItem);
      });

      productsWrapper.appendChild(productList);
      contentWrapper.appendChild(productsWrapper);
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

});