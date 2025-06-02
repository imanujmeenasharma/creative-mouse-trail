document.addEventListener("DOMContentLoaded", () => {
  const config = {
    imageLifespan: 1000,
    mouseThreshold: 150,
    inDuration: 750,
    outDuration: 1000,
    staggerIn: 100,
    staggerOut: 25,
    slideDuration: 1000,
    slideEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    easing: "cubic-bezier(0.87, 0, 0.13, 1)",
  };

  const trailImageCount = 20;

  const images = Array.from(
    { length: trailImageCount },
    (_, i) => `/img${i + 1}.jpeg`
  );

  const trailContainer = document.querySelector(".trail-container");
  let isDesktop = window.innerWidth > 1000;

  const trail = [];
  let animationState = null;
  let currentImageIndex = 0;
  let mousePos = { x: 0, y: 0 };
  let lastMousePos = { x: 0, y: 0 };
  let interpolatedMousePos = { x: 0, y: 0 };

  const MathUtils = {
    lerp: (a, b, n) => (1 - n) * a + n * b,
    distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  };

  const getMouseDistance = () =>
    MathUtils.distance(mousePos.x, mousePos.y, lastMousePos.x, lastMousePos.y);

  const isInTrailContainer = (x, y) => {
    const rect = trailContainer.getBoundingClientRect();
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  };

  const createTrailImage = () => {
    const imgContainer = document.createElement("div");
    imgContainer.classList.add("trail-img");

    const imgSrc = images[currentImageIndex];
    currentImageIndex = (currentImageIndex + 1) % trailImageCount;

    const rect = trailContainer.getBoundingClientRect();
    const startX = interpolatedMousePos.x - rect.left - 87.5;
    const startY = interpolatedMousePos.y - rect.top - 87.5;
    const targetX = mousePos.x - rect.left - 87.5;
    const targetY = mousePos.y - rect.top - 87.5;

    imgContainer.style.left = `${startX}px`;
    imgContainer.style.top = `${startY}px`;
    imgContainer.style.transition = `left ${config.slideDuration}ms ${config.slideEasing}, top ${config.slideDuration}ms ${config.slideEasing}`;

    const maskLayers = [];
    const imageLayers = [];
    for (let i = 0; i < 10; i++) {
      const layer = document.createElement("div");
      layer.classList.add("mask-layer");

      const imageLayer = document.createElement("div");
      imageLayer.classList.add("image-layer");
      imageLayer.style.backgroundImage = `url(${imgSrc})`;

      const startY = i * 10;
      const endY = (i + 1) * 10;

      layer.style.clipPath = `polygon(50% ${startY}%, 50% ${startY}%, 50% ${endY}%, 50% ${endY}%)`;
      layer.style.transition = `clip-path ${config.inDuration}ms ${config.easing}`;
      layer.style.transform = "translateZ(0)";
      layer.style.backfaceVisibility = "hidden";

      layer.appendChild(imageLayer);
      imgContainer.appendChild(layer);
      maskLayers.push(layer);
      imageLayers.push(imageLayer);
    }

    trailContainer.appendChild(imgContainer);

    requestAnimationFrame(() => {
      imgContainer.style.left = `${targetX}px`;
      imgContainer.style.top = `${targetY}px`;

      maskLayers.forEach((layer, i) => {
        const startY = i * 10;
        const endY = (i + 1) * 10;
        const distanceFromMiddle = Math.abs(i - 4.5);
        const delay = distanceFromMiddle * config.staggerIn;

        setTimeout(() => {
          layer.style.clipPath = `polygon(0% ${startY}%, 100% ${startY}%, 100% ${endY}%, 0% ${endY}%)`;
        }, delay);
      });
    });

    trail.push({
      element: imgContainer,
      maskLayers: maskLayers,
      imageLayers: imageLayers,
      removeTime: Date.now() + config.imageLifespan,
    });
  };

  const removeOldImages = () => {
    const now = Date.now();
    if (trail.length === 0) return;

    const oldestImage = trail[0];
    if (now >= oldestImage.removeTime) {
      const imgToRemove = trail.shift();

      imgToRemove.maskLayers.forEach((layer, i) => {
        const startY = i * 10;
        const endY = (i + 1) * 10;
        const distanceFromEdge = 4.5 - Math.abs(i - 4.5);
        const delay = distanceFromEdge * config.staggerOut;

        layer.style.transition = `clip-path ${config.outDuration}ms ${config.easing}`;

        setTimeout(() => {
          layer.style.clipPath = `polygon(50% ${startY}%, 50% ${startY}%, 50% ${endY}%, 50% ${endY}%)`;
        }, delay);
      });

      imgToRemove.imageLayers.forEach((imageLayer) => {
        imageLayer.style.transition = `opacity ${config.outDuration}ms ${config.easing}`;
        imageLayer.style.opacity = "0.25";
      });

      setTimeout(() => {
        if (imgToRemove.element.parentNode) {
          imgToRemove.element.parentNode.removeChild(imgToRemove.element);
        }
      }, config.outDuration + 112);
    }
  };

  const render = () => {
    if (!isDesktop) return;

    const distance = getMouseDistance();

    interpolatedMousePos.x = MathUtils.lerp(
      interpolatedMousePos.x || mousePos.x,
      mousePos.x,
      0.1
    );
    interpolatedMousePos.y = MathUtils.lerp(
      interpolatedMousePos.y || mousePos.y,
      mousePos.y,
      0.1
    );

    if (
      distance > config.mouseThreshold &&
      isInTrailContainer(mousePos.x, mousePos.y)
    ) {
      createTrailImage();
      lastMousePos = { ...mousePos };
    }

    removeOldImages();
    requestAnimationFrame(render);
  };

  const startAnimation = () => {
    if (!isDesktop) return;

    document.addEventListener("mousemove", (e) => {
      mousePos = { x: e.clientX, y: e.clientY };
    });

    animationState = requestAnimationFrame(render);
  };

  const stopAnimation = () => {
    if (animationState) {
      cancelAnimationFrame(animationState);
      animationState = null;
    }

    trail.forEach((item) => {
      if (item.element.parentNode) {
        item.element.parentNode.removeChild(item.element);
      }
    });
    trail.length = 0;
  };

  const handleResize = () => {
    const wasDesktop = isDesktop;
    isDesktop = window.innerWidth > 1000;

    if (isDesktop && !wasDesktop) {
      startAnimation();
    } else if (!isDesktop && wasDesktop) {
      stopAnimation();
    }
  };

  window.addEventListener("resize", handleResize);

  if (isDesktop) {
    startAnimation();
  }
});
