const glow = document.querySelector(".glow");
const menuButton = document.querySelector("[data-menu]");
const nav = document.querySelector("[data-nav]");

window.addEventListener("pointermove", (event) => {
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    nav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});

const animatedItems = document.querySelectorAll(".work-card, .service, .step");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.animate(
          [
            { opacity: 0, transform: "translateY(28px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
        );
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

animatedItems.forEach((item) => {
  item.style.opacity = 0;
  observer.observe(item);
});
