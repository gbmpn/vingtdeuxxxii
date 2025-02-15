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
              priceRange {
                minVariantPrice {
                  amount
                }
              }
              images(first: 1) {
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
  
  // Function to populate collections and products
  const populateCollections = (collections) => {
    const contentWrapper = document.querySelector('.content')
  
    collections.forEach((collection) => {
      const { title, products, metafield } = collection.node;
  
      // Extract banner image URL
    const bannerImageSrc = metafield?.reference?.image?.url || "./images/cover.png";
        console.log(bannerImageSrc)
  
      // Add a title for the collection, wrapped in <div class="heading">
      const heading = document.createElement("div");
      heading.classList.add("heading");
  
      const collectionTitle = document.createElement("h2");
      collectionTitle.textContent = title;
      heading.appendChild(collectionTitle);
      contentWrapper.appendChild(heading);
  
      // Create a wrapper div for the product list
      const productsWrapper = document.createElement("div");
      productsWrapper.classList.add("products");

      
      // Create a product list for the collection
      const productList = document.createElement("ul");
      productList.classList.add("products-list");
      productList.classList.add("products__list");
  
      products.edges.forEach((product) => {
        const { id, title, priceRange, images, availableForSale } = product.node;
  
        // Create list item for each product
        const productItem = document.createElement("li");
        productItem.classList.add("products__item");
        productItem.setAttribute("data-id", id);
        productItem.setAttribute("data-price", priceRange.minVariantPrice.amount);
        productItem.setAttribute("data-name", title);
        productItem.setAttribute("data-cover", images.edges[0]?.node.src);
  
        // Create product image section
        const productImages = document.createElement("div");
        productImages.classList.add("products__images");
        const mainImage = document.createElement("img");
        mainImage.classList.add("products__main-image");
        mainImage.setAttribute("src", images.edges[0]?.node.src || "./images/default.jpg");
        mainImage.setAttribute("alt", title);
  
        const gallery = document.createElement("div");
        gallery.classList.add("products__gallery");
        const galleryImage = document.createElement("img");
        galleryImage.classList.add("products__gallery-item");
        galleryImage.setAttribute("src", images.edges[0]?.node.src || "./images/default.jpg");
        galleryImage.setAttribute("alt", `${title} gallery`);
  
        gallery.appendChild(galleryImage);
        productImages.appendChild(mainImage);
        productImages.appendChild(gallery);
  
        // Create bottom navigation with add to cart button and stock status
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
  
        // Append all elements to the product item
        productItem.appendChild(productImages);
        productItem.appendChild(navBottom);
  
        // Add the product item to the product list
        productList.appendChild(productItem);
        
      });
  
      // Wrap the product list in the .products div
      productsWrapper.appendChild(productList);
  
      // Append the .products div to the collection container
      contentWrapper.appendChild(productsWrapper);
  
    const customSection = document.createElement("div");
    customSection.classList.add("custom-section");
    contentWrapper.appendChild(productsWrapper);

    // Create and append the .banner-marquee div **after each** .products div
    const bannerMarquee = document.createElement("div");
    bannerMarquee.classList.add("banner-marquee");
    bannerMarquee.innerHTML = `
        <div class="text-marquee">
            <div class="text-single">
                <span class="text js-text">vingtdeuxxxii</span>
                <span class="text js-text">عشريني وعشرون</span>
                <span class="text js-text">vingtdeuxxxii</span>
                <span class="text js-text">iskay chunka</span>
                <span class="text js-text">кокло кок</span>
                <span class="text js-text">스물두시.2020年</span>
            </div>
        </div>
        <div class="imgWrapper">
            <img src="${bannerImageSrc}" alt="">
        </div>
        <div class="text-marquee">
            <div class="text-single">
                <span class="text js-text">vingtdeuxxxii</span>
                <span class="text js-text">عشريني وعشرون</span>
                <span class="text js-text">vingtdeuxxxii</span>
                <span class="text js-text">iskay chunka</span>
                <span class="text js-text">кокло кок</span>
                <span class="text js-text">스물두시.2020年</span>
            </div>
        </div>
    `;

    // Append the banner marquee **after** each .products div
    contentWrapper.appendChild(bannerMarquee);

    let loops = gsap.utils.toArray('.text-single').map((line, i) => {
      const links = line.querySelectorAll(".js-text");
      return horizontalLoop(links, {
        repeat: -1, 
        speed: 1.5 + i * 0.5,
        reversed: false,
        paddingRight: parseFloat(gsap.getProperty(links[0], "marginRight", "px"))
      });
    });
    });
  };
  
  // Call the function to fetch and display collections and products
  fetchCollectionsAndProducts();
  
  // 
  

  const images = [...document.querySelectorAll('img')];

  await preloadImages(images).then(() => {
    setTimeout(() => {
      document.body.classList.remove('loading');
    }, 1200)
  })
  
  

  let currentScroll = 0;
  let scrollDirection = 1;

  window.addEventListener("scroll", () => {
  let direction = (window.pageYOffset > currentScroll) ? 1 : -1;
  if (direction !== scrollDirection) {
    console.log("change", direction);
    loops.forEach(tl => {
      gsap.to(tl, {timeScale: direction, overwrite: true});
    });
    scrollDirection = direction;
  }
  currentScroll = window.pageYOffset;
  });


  /*
  This helper function makes a group of elements animate along the x-axis in a seamless, responsive loop.

  Features:
  - Uses xPercent so that even if the widths change (like if the window gets resized), it should still work in most cases.
  - When each item animates to the left or right enough, it will loop back to the other side
  - Optionally pass in a config object with values like "speed" (default: 1, which travels at roughly 100 pixels per second), paused (boolean),  repeat, reversed, and paddingRight.
  - The returned timeline will have the following methods added to it:
  - next() - animates to the next element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
  - previous() - animates to the previous element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
  - toIndex() - pass in a zero-based index value of the element that it should animate to, and optionally pass in a vars object to control duration, easing, etc. Always goes in the shortest direction
  - current() - returns the current index (if an animation is in-progress, it reflects the final index)
  - times - an Array of the times on the timeline where each element hits the "starting" spot. There's also a label added accordingly, so "label1" is when the 2nd element reaches the start.
  */
  function horizontalLoop(items, config) {
    items = gsap.utils.toArray(items);
    config = config || {};
    let tl = gsap.timeline({repeat: config.repeat, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      xPercents = [],
      curIndex = 0,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
      totalWidth, curX, distanceToStart, distanceToLoop, item, i;
    gsap.set(items, { // convert "x" to "xPercent" to make things responsive, and populate the widths/xPercents Arrays to make lookups faster.
      xPercent: (i, el) => {
        let w = widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
        xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / w * 100 + gsap.getProperty(el, "xPercent"));
        return xPercents[i];
      }
    });
    gsap.set(items, {x: 0});
    totalWidth = items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0);
    for (i = 0; i < length; i++) {
      item = items[i];
      curX = xPercents[i] / 100 * widths[i];
      distanceToStart = item.offsetLeft + curX - startX;
      distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
      tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
      .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
      .add("label" + i, distanceToStart / pixelsPerSecond);
      times[i] = distanceToStart / pixelsPerSecond;
    }
    function toIndex(index, vars) {
      vars = vars || {};
      (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex];
      if (time > tl.time() !== index > curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
        vars.modifiers = {time: gsap.utils.wrap(0, tl.duration())};
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      curIndex = newIndex;
      vars.overwrite = true;
      return tl.tweenTo(time, vars);
    }
    tl.next = vars => toIndex(curIndex+1, vars);
    tl.previous = vars => toIndex(curIndex-1, vars);
    tl.current = () => curIndex;
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.times = times;
  if (config.reversed) {
    tl.vars.onReverseComplete();
    tl.reverse();
  }
    return tl;
  }


  // navigation

  const navTrigger = document.querySelector('.navTrigger');
  const navContainer = document.querySelector('.navigation');

  navTrigger.addEventListener('click', () => {
    navContainer.classList.toggle('is-open')
  })

  Draggable.create(navContainer, {
    bounds: { minX: 0, maxX: window.innerWidth - navContainer.offsetWidth },
    inertia: true,
    throwProps: true, // Enables momentum-based movement
    edgeResistance: 0.8, // Controls resistance when hitting bounds
    // onDragStart: function () {
    //   gsap.to(this.target, { scale: 1.05, duration: 0.2, ease: "power2.out" }); // Small scale-up effect
    // },
    // onDragEnd: function () {
    //   gsap.to(this.target, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.4)" }); // Smooth return
    // }
  });

  // gsap.to(navContainer, {
  //   y: () => window.scrollY * 0.2, // Adjust smoothness (lower value = smoother)
  //   ease: "power1.out",
  //   scrollTrigger: {
  //     trigger: "body",
  //     start: "top top",
  //     end: "bottom bottom",
  //     scrub: 1, // Smooth scrolling effect
  //   },
  // });
   
});