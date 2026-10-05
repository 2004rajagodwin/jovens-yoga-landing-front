import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AOS from "aos";
import Swiper from "swiper";
import { Navigation } from "swiper/modules";
import $ from "../lib/owlCarousel.js";
import PricingSection from "../components/PricingSection.jsx";
import { validateReferralCode } from "../services/referralApi.js";
import { setStoredReferralCode, clearStoredReferralCode } from "../services/referralStorage.js";

const heroSlides = [
  { video: "/images/yoga.girl.mp4" },
  { video: "/images/yoga.girl2.mp4" },
  { video: "/images/yoga.girl.mp4" },
];

const watchTabs = [
  {
    key: "traditional",
    label: "Traditional Yoga",
    slides: [
      { img: "/images/watch-1.webp", alt: "Traditional Yoga", video: "/images/yoga-video.mp4", type: "video", title: "Traditional Yoga", desc: "Slow and beginner-friendly" },
      { img: "/images/watch2.webp", alt: "Strength Yoga", video: "/images/yoga-video-2.mp4", type: "youtube", title: "Strength Yoga", desc: "Focus on alignment and posture" },
    ],
  },
  {
    key: "strength",
    label: "Strength Yoga",
    slides: [
      { img: "/images/wat-1.webp", alt: "Strength Yoga 1", video: "/images/yoga-video.mp4", type: "video", title: "Core Power Flow", desc: "Build strength through movement" },
      { img: "/images/wat-2.webp", alt: "Strength Yoga 2", video: "/images/yoga-video-2.mp4", type: "video", title: "Balance & Alignment", desc: "Focus on alignment and posture" },
    ],
  },
  {
    key: "recovery",
    label: "Recovery Yoga",
    slides: [
      { img: "/images/wat-3.webp", alt: "Recovery Yoga 1", video: "/images/yoga-video.mp4", type: "video", title: "Gentle Restore", desc: "Ease tension and unwind" },
      { img: "/images/wat4.webp", alt: "Recovery Yoga 2", video: "/images/yoga-video.mp4", type: "video", title: "Deep Stretch", desc: "Slow, mindful movement" },
    ],
  },
  {
    key: "meditation",
    label: "Meditation",
    slides: [
      { img: "/images/watch-1.webp", alt: "Meditation 1", video: "/images/yoga-video.mp4", type: "video", title: "Breathwork Basics", desc: "Calm your mind, breathe deeply" },
      { img: "/images/wat-3.webp", alt: "Meditation 2", video: "/images/yoga-video-2.mp4", type: "video", title: "Guided Stillness", desc: "Find quiet, find focus" },
    ],
  },
];

const wygCards = [
  { img: "/images/caro-1.png", alt: "Sunset yoga practice", title: "A fixed time. A lasting routine.", desc: "Mon–Fri. Every weekday. A dedicated time for your practice with your teacher guiding you along the way." },
  { img: "/images/caro-2.png", alt: "Yoga class session", title: "A teacher who knows your journey.", desc: "Assigned from day one. One consistent relationship that supports your progress month after month." },
  { img: "/images/caro-3.png", alt: "Posture guidance", title: "Personal posture guidance.", desc: "Live posture corrections and personalized feedback to help you move with confidence and improve your practice." },
  { img: "/images/caro-4.png", alt: "Private practice space", title: "A private space to grow.", desc: "Quiet, unhurried surroundings set apart from the everyday, so your practice never feels rushed or shared." },
];

const instructors = [
  { img: "/images/meet-1.png", overlay: "overlay-orange", name: "EMMA THOMPSON", role: "Expert Guidance" },
  { img: "/images/pk-2.png", overlay: "overlay-green", name: "MAYA PATEL", role: "Wellness Guide" },
  { img: "/images/pk-3.png", overlay: "overlay-gray", name: "SOPHIA CARTER", role: "Wellness Coach" },
  { img: "/images/pk-4.png", overlay: "overlay-blue", name: "JOHN SMITH", role: "Expert Guidance" },
];

const testimonials = [
  { title: "Life-Changing Yoga Journey", quote: "\"Joining these yoga classes has improved my flexibility, focus, and overall well-being. The instructors are supportive", cardClass: "card-blue", quoteImg: "/images/neweww.png" },
  { title: "Best Yoga Experience", quote: "\"The sessions are calming, engaging, and suitable for all levels. Yoga has become an important part of my daily routine.\"", cardClass: "card-cream", quoteImg: "/images/quote-2.png" },
  { title: "Worth Every Session", quote: "\"Excellent guidance, positive atmosphere, and noticeable results. Wonderful yoga experience for beginners.\"", cardClass: "card-green", quoteImg: "/images/quote-4.png" },
];

const faqs = [
  {
    q: "Is my card charged during the free trial?",
    a: "No. Your card is saved securely when you sign up, but nothing is charged during your trial period. If you cancel before it ends, you pay nothing. Not a single cent."
  },
  {
    q: "How do I cancel?",
    a: "You can cancel your membership anytime from your account dashboard without any hidden charges."
  },
  {
    q: "What if I miss a class?",
    a: "Don't worry. You can reschedule your missed class based on your teacher's availability."
  },
  {
    q: "What timezone are the classes in?",
    a: "All classes are scheduled according to the timezone shown when you book your class, so you can easily plan your sessions around your local time."
  },
  {
    q: "I am a complete beginner. Is this right for me?",
    a: "Absolutely! Our classes are designed for complete beginners and experienced learners."
  },
  {
    q: "What equipment do I need?",
    a: "You only need a yoga mat and a comfortable space to practice. No special equipment is required."
  },
  {
    q: "Can someone join the class with me?",
    a: "Yes! You can have someone join the class with you, depending on the membership plan and class guidelines."
  },
  {
    q: "Are the classes recorded? Can I watch them later?",
    a: "Yes. Depending on your membership plan, recordings are available after the class."
  },
  {
    q: "How does the monthly progress report work?",
    a: "Your monthly progress report helps you track your attendance, consistency, completed sessions, and overall progress throughout the month."
  },
  {
    q: "Is there a long-term contract?",
    a: "No. There is no long-term contract. You can cancel your membership anytime from your account dashboard."
  }
];

export default function Home() {
  const location = useLocation();
  const heroSliderRef = useRef(null);
  const testimonialRef = useRef(null);

  const [activeTab, setActiveTab] = useState(watchTabs[0].key);
  const [playingSlide, setPlayingSlide] = useState(null); // "tabKey-slideIndex"

  const [openFaq, setOpenFaq] = useState(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const jtsSwipers = useRef({});
  const jtsPanelEls = useRef({});
  const jtsSwiperEls = useRef({});
  const jtsPrevEls = useRef({});
  const jtsNextEls = useRef({});
  const jtsProgressEls = useRef({});

  const wygOuterRef = useRef(null);
  const wygTrackRef = useRef(null);
  const wygPrevRef = useRef(null);
  const wygNextRef = useRef(null);
  const wygWrapRef = useRef(null);

  // AOS: initialize exactly once for the whole page
  useEffect(() => {
    AOS.init({ duration: 1000, easing: "ease-in-out", once: true, offset: 50 });
  }, []);

  // Referral Link Attribution: Read ?ref=... from URL, validate and store safely.
  // We store immediately synchronously so instant navigation to checkout preserves attribution,
  // then asynchronously validate against the server to confirm validity and retrieve the referrer's name.
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search || window.location.search);
      const refParam = searchParams.get("ref");
      if (refParam && refParam.trim()) {
        const cleanRef = refParam.trim().toUpperCase();
        setStoredReferralCode(cleanRef);
        validateReferralCode(cleanRef)
          .then((res) => {
            if (res && res.valid) {
              setStoredReferralCode(cleanRef, res.referralPersonName);
            } else {
              // If backend reports invalid or disabled code, remove it so it's not falsely used
              clearStoredReferralCode();
            }
          })
          .catch(() => {
            // Keep synchronous storage as fallback for slow/offline networks
          });
      }
    } catch {
      // Ignore
    }
  }, [location.search]);

  // Hero banner slider (Owl Carousel) — fade transition, dots, autoplay,
  // only the active slide's video plays and resets on slide change.
  useEffect(() => {
    const $slider = $(heroSliderRef.current);

    function updateSlideVideos() {
      $slider.find(".jbs-slide video").each(function () {
        const video = this;
        const isActive = $(video).closest(".owl-item").hasClass("active");
        if (isActive) {
          video.currentTime = 0;
          const playPromise = video.play();
          if (playPromise !== undefined) playPromise.catch(() => {});
        } else {
          video.pause();
        }
      });
    }

    function bindEndedOnActiveVideo() {
      $slider.find("video").off("ended.jbsSlider");
      const $activeVideo = $slider.find(".owl-item.active .jbs-slide video").first();
      if ($activeVideo.length) {
        $activeVideo.on("ended.jbsSlider", function () {
          $slider.trigger("next.owl.carousel", [600]);
        });
      }
    }

    $slider.owlCarousel({
      items: 1,
      loop: true,
      nav: false,
      dots: true,
      autoplay: true,
      autoplayTimeout: 5000,
      autoplayHoverPause: true,
      smartSpeed: 600,
      animateOut: "fadeOut",
      animateIn: "fadeIn",
      mouseDrag: true,
      touchDrag: true,
      onInitialized: function () {
        AOS.refresh();
        updateSlideVideos();
        bindEndedOnActiveVideo();
      },
      onTranslated: function () {
        AOS.refresh();
        updateSlideVideos();
        bindEndedOnActiveVideo();
      },
    });

    return () => {
      $slider.find("video").off("ended.jbsSlider");
      $slider.trigger("destroy.owl.carousel");
    };
  }, []);

  // Testimonials slider (Owl Carousel)
  useEffect(() => {
    const $t = $(testimonialRef.current);
    $t.owlCarousel({
      loop: true,
      margin: 30,
      autoplay: true,
      autoplayTimeout: 3500,
      smartSpeed: 700,
      dots: true,
      nav: false,
      responsive: { 0: { items: 1 }, 768: { items: 2 }, 1200: { items: 3 } },
    });

    return () => {
      $t.trigger("destroy.owl.carousel");
    };
  }, []);

  // Watch Live Class tab section: init a Swiper per tab the first time it
  // becomes active, matching the original lazy-init behaviour.
  useEffect(() => {
    const tab = activeTab;
    if (jtsSwipers.current[tab]) {
      jtsSwipers.current[tab].update();
      return;
    }

    const total = watchTabs.find((t) => t.key === tab).slides.length;

    function updateProgress(instance) {
      const bar = jtsProgressEls.current[tab];
      if (!bar) return;
      const current = instance.realIndex + 1;
      bar.style.width = (current / total) * 100 + "%";
    }

    const instance = new Swiper(jtsSwiperEls.current[tab], {
      modules: [Navigation],
      slidesPerView: 1.2,
      spaceBetween: 20,
      loop: true,
      navigation: { nextEl: jtsNextEls.current[tab], prevEl: jtsPrevEls.current[tab] },
      breakpoints: {
        0: { slidesPerView: 1.1 },
        576: { slidesPerView: 1.4 },
        768: { slidesPerView: 1.8 },
        1000: { slidesPerView: 1.4 },
      },
      on: { slideChange: function () { updateProgress(this); } },
    });

    jtsSwipers.current[tab] = instance;
    updateProgress(instance);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      Object.values(jtsSwipers.current).forEach((instance) => instance.destroy(true, true));
    };
  }, []);

  // "What You Get" custom infinite carousel — ported from the original
  // vanilla-JS clone-based loop so behaviour (drag, autoplay, breakpoints) is unchanged.
  useEffect(() => {
    const outer = wygOuterRef.current;
    const track = wygTrackRef.current;
    const prevBtn = wygPrevRef.current;
    const nextBtn = wygNextRef.current;
    const wrap = wygWrapRef.current;
    const gap = 20;

    const originals = Array.from(track.children);
    const realCount = originals.length;
    const cloneCount = realCount;

    const headClones = originals.slice(0, cloneCount).map((el) => el.cloneNode(true));
    const tailClones = originals.slice(-cloneCount).map((el) => el.cloneNode(true));

    tailClones.forEach((clone) => track.insertBefore(clone, track.firstChild));
    headClones.forEach((clone) => track.appendChild(clone));

    track.querySelectorAll(".wyg-card").forEach((card, i) => {
      if (i < cloneCount || i >= cloneCount + realCount) {
        card.setAttribute("aria-hidden", "true");
        card.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
      }
    });

    const allCards = Array.from(track.children);
    let currentIndex = cloneCount;

    let isDown = false;
    let startX = 0;
    let startTranslate = 0;
    let currentTranslate = 0;
    let dragMoved = false;

    const AUTOPLAY_MS = 3000;
    let autoplayTimer = null;
    let isPaused = false;

    function getStep() {
      const rect = allCards[0].getBoundingClientRect();
      return rect.width + gap;
    }

    function translateForIndex(index) {
      return -(index * getStep());
    }

    function setTransform(px, animate) {
      track.style.transition = animate ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
      track.style.transform = `translateX(${px}px)`;
    }

    function goTo(index, animate = true) {
      currentIndex = index;
      currentTranslate = translateForIndex(currentIndex);
      setTransform(currentTranslate, animate);
    }

    function onTransitionEnd() {
      if (currentIndex >= cloneCount + realCount) {
        currentIndex -= realCount;
        goTo(currentIndex, false);
      } else if (currentIndex < cloneCount) {
        currentIndex += realCount;
        goTo(currentIndex, false);
      }
    }

    function next() { goTo(currentIndex + 1, true); }
    function prev() { goTo(currentIndex - 1, true); }

    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(() => {
        if (!isPaused && !isDown) next();
      }, AUTOPLAY_MS);
    }
    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    function restartAutoplay() { startAutoplay(); }

    function onMouseEnter() { isPaused = true; }
    function onMouseLeave() { isPaused = false; }

    function pointerDown(clientX) {
      isDown = true;
      dragMoved = false;
      startX = clientX;
      startTranslate = currentTranslate;
      track.classList.add("wyg-dragging");
    }
    function pointerMove(clientX) {
      if (!isDown) return;
      const dx = clientX - startX;
      if (Math.abs(dx) > 4) dragMoved = true;
      currentTranslate = startTranslate + dx;
      setTransform(currentTranslate, false);
    }
    function pointerUp() {
      if (!isDown) return;
      isDown = false;
      track.classList.remove("wyg-dragging");
      const step = getStep();
      const nearest = Math.round(-currentTranslate / step);
      goTo(nearest, true);
      restartAutoplay();
    }

    function onMouseDown(e) { e.preventDefault(); pointerDown(e.clientX); }
    function onWindowMouseMove(e) { pointerMove(e.clientX); }
    function onWindowMouseUp() { pointerUp(); }
    function onTouchStart(e) { pointerDown(e.touches[0].clientX); }
    function onTouchMove(e) { pointerMove(e.touches[0].clientX); }
    function onTrackClick(e) {
      if (dragMoved) { e.preventDefault(); e.stopPropagation(); }
    }
    function onResize() { goTo(currentIndex, false); }
    function onPrevClick() { prev(); restartAutoplay(); }
    function onNextClick() { next(); restartAutoplay(); }

    prevBtn.addEventListener("click", onPrevClick);
    nextBtn.addEventListener("click", onNextClick);
    wrap.addEventListener("mouseenter", onMouseEnter);
    wrap.addEventListener("mouseleave", onMouseLeave);
    track.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchmove", onTouchMove, { passive: true });
    track.addEventListener("touchend", pointerUp);
    track.addEventListener("click", onTrackClick, true);
    track.addEventListener("transitionend", onTransitionEnd);
    window.addEventListener("resize", onResize);

    goTo(currentIndex, false);
    startAutoplay();

    return () => {
      stopAutoplay();
      prevBtn.removeEventListener("click", onPrevClick);
      nextBtn.removeEventListener("click", onNextClick);
      wrap.removeEventListener("mouseenter", onMouseEnter);
      wrap.removeEventListener("mouseleave", onMouseLeave);
      track.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchmove", onTouchMove);
      track.removeEventListener("touchend", pointerUp);
      track.removeEventListener("click", onTrackClick, true);
      track.removeEventListener("transitionend", onTransitionEnd);
      window.removeEventListener("resize", onResize);
      track.replaceChildren(...originals);
      track.style.transform = "";
      track.style.transition = "";
    };
  }, []);

  // Sticky WhatsApp button — fades in after scrolling 600px
  useEffect(() => {
    function onScroll() {
      setShowWhatsApp(window.scrollY >= 600);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleTabClick(tab) {
    setActiveTab(tab);
  }

  function handlePlaySlide(tab, index) {
    setPlayingSlide(`${tab}-${index}`);
  }


  
const floatStyle = `
  @keyframes jovensFloatInline {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-18px); }
  }
  .jovens-float-img {
    animation: jovensFloatInline 4s ease-in-out infinite !important;
  }
`;
  return (
    <>

    <style>{floatStyle}</style>

      {/* Hero banner slider */}
      <section className="jovence-banner-slider-section">
        <div ref={heroSliderRef} className="owl-carousel owl-slider jbs-owl-slider">
          {heroSlides.map((slide, i) => (
            <div className={`jbs-slide jbs-slide-${i + 1}`} key={i}>
              <video className="jbs-slide-video" autoPlay muted playsInline>
                <source src={slide.video} type="video/mp4" />
              </video>

              <div className="jbs-header">
                <div data-aos={i === 0 ? "fade-down" : undefined} className="jbs-logo">
                  {i === 0 ? (
                    <img className="jbs-logo-mian" src="/images/joven-main-logo.png" alt="" />
                  ) : (
                    <a href="#top">
                      <img className="jbs-logo-mian" src="/images/joven-main-logo.png" alt="" />
                    </a>
                  )}
                </div>
                <a data-aos={i === 0 ? "fade-down" : undefined} href="#" className="jbs-btn">
                  Try Free For 5 Days
                </a>
              </div>

              <div className="jbs-body">
                <div data-aos={i === 0 ? "fade-right" : undefined} className="jbs-text">
                  <h1>
                    Every body is different. <b>Your plan should be too.</b>
                  </h1>
                  <p>
                    Sessions adapt to your flexibility, goals, and schedule. Small live classes
                    mean real feedback on your form, every single time you show up on the mat.
                  </p>
                  <a href="#" className="jbs-btn">Try Free For 5 Days</a>
                </div>
              </div>

              <div className="main-rele-imgg">
                <div className="banner-badge-layer-image-div">
                  <img className="banner-badge-layer-image" src="/images/layer-back.png" alt="" />
                </div>

                <div className="jbs-badge">
                  <div className="jbs-avatars">
                    {["s1.jpg", "s2.jpg", "s3.jpg", "s4.jpg"].map((img) => (
                      <img key={img} data-aos={i === 0 ? "zoom-in" : undefined} src={`/images/${img}`} alt="Member" />
                    ))}
                  </div>
                  <div data-aos={i === 0 ? "zoom-in" : undefined} className="jbs-badge-text">
                    4.8/5 from 100+<br />members
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted by section */}
      <section className="joven-trusted-section">
        <div className="container">
          <div className="joven-trusted-wrapper">
            <div className="joven-trusted-heading text-center">
              <h2 data-aos="fade-up">Trusted <span>by Learners</span></h2>
              <p data-aos="fade-up">
                Helping students grow through expert-led sessions and proven methods.
              </p>
            </div>

            <div className="joven-trusted-box">
              <div className="row g-0 align-items-center">
                <div className="col-lg-4 col-md-4">
                  <div data-aos="fade-right" className="joven-trusted-item">
                    <h3>200+</h3>
                    <p>Hours Certified</p>
                  </div>
                </div>

                <div className="col-lg-4 col-md-4">
                  <div data-aos="zoom-in" className="joven-trusted-item joven-border">
                    <h3>3+ Years</h3>
                    <p>Teaching Online</p>
                  </div>
                </div>

                <div className="col-lg-4 col-md-4">
                  <div data-aos="fade-left" className="joven-trusted-item">
                    <h3>Mon–Fri</h3>
                    <p>Live sessions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why members section */}
      <section className="jovens-member-section">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-lg-6">
              <div className="jovens-member-content" data-aos="fade-right">
                <h2 className="jovens-member-title">
                  Why members <span>choose</span><br />
                  <span>Jovens</span>
                </h2>

                <ul className="jovens-member-list">
                  <li><i className="fa-solid fa-circle-check"></i>Live sessions led by experienced teachers</li>
                  <li><i className="fa-solid fa-circle-check"></i>Personal guidance and real-time corrections</li>
                  <li><i className="fa-solid fa-circle-check"></i>Structured sessions that build consistency</li>
                  <li><i className="fa-solid fa-circle-check"></i>A welcoming community that supports your journey</li>
                  <li><i className="fa-solid fa-circle-check"></i>Affordable access to expert instruction</li>
                </ul>

                <p className="jovens-member-text">
                  Yoga works best when you have the right support system.
                </p>

                <a href="#" style={{ border: "4px solid #F3BC8F" }} className="jbs-btn">
                  Try Free For 5 Days
                </a>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="jovens-member-image">
                <img data-aos="zoom-in" src="/images/right-main-img.png" alt="Yoga" className="img-fluid" />
                <div data-aos="flip-right" className="jovens-member-card">
                  <h4>Consistency creates results</h4>
                  <div className="center-border"></div>
                  <p>
                    That's why Jovens gives you a real teacher who guides, motivates, and
                    supports you in every class.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jovens Difference section */}
      <section className="jovens-different-section py-5">
        <div className="container">
          <div className="jovens-different-wrapper">
            <div className="absoluteborderimg-div">
              <img className="absoluteborderimg" src="/images/Group 2085668682.png" alt="" />
            </div>

            <div className="row g-0">
              <div className="col-lg-5">
                <div data-aos="fade-right" className="jovens-different-section-left">
                  <img src="/images/jovens.png" className="img-fluid jovens-different-section-left-img" alt="" />
                </div>
              </div>

              <div className="col-lg-7">
                <div className="jovens-different-section-right">
                  <span data-aos="fade-left" className="jovens-small-title">THE JOVENS DIFFERENCE</span>

                  <h2 data-aos="fade-left" className="jovens-main-title">
                    This is not a <span>yoga app.</span>
                  </h2>

                  <p data-aos="fade-left" className="jovens-text">
                    This isn't another app you quit. This is a class that expects you to show up.
                  </p>

                  <div className="jovens-divider"></div>

                  <div className="jovens-feature-list">
                    <div data-aos="zoom-in" className="jovens-feature">Knows your name</div>
                    <div data-aos="zoom-in" className="jovens-feature">Corrects your posture live</div>
                    <div data-aos="zoom-in" className="jovens-feature">Tracks your progress monthly</div>
                    <div data-aos="zoom-in" className="jovens-feature">Notices when you miss class</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-jovens-section py-5">
        <div className="container">
          <div className="text-center how-it-heading">
            <h6 data-aos="fade-up" className="how-it-subtitle">THE PROCESS</h6>
            <h2 data-aos="fade-up" className="how-it-title">How it <span>works</span></h2>
          </div>

          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <div data-aos="flip-left" className="how-it-jovens-section-main">
                <div className="how-it-img-div">
                  <img className="how-it-img-div-img" src="/images/how-1.png" alt="Book your free 5-day yoga trial" />
                  <h3 className="how-it-img-title">Book your free<br />5-day trial</h3>
                </div>
                <div className="how-it-content">
                  <p>Fill in your details and choose your preferred class slot.</p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div data-aos="flip-right" className="how-it-jovens-section-main">
                <div className="how-it-img-div">
                  <img className="how-it-img-div-img" src="/images/how-2.png" alt="Live yoga session with teacher" />
                  <h3 className="how-it-img-title">Join live with your<br />assigned teacher</h3>
                </div>
                <div className="how-it-content">
                  <p>Your teacher welcomes you by name from day one. 60-minute live sessions with personal guidance.</p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div data-aos="flip-left" className="how-it-jovens-section-main">
                <div className="how-it-img-div">
                  <img className="how-it-img-div-img" src="/images/how-3.png" alt="Real-time yoga guidance" />
                  <h3 className="how-it-img-title">Receive real-<br />time guidance</h3>
                </div>
                <div className="how-it-content">
                  <p>Your teacher observes your practice, provides posture corrections, and supports you throughout the class.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mt-2">
            <div className="col-lg-4 col-md-6">
              <div data-aos="flip-right" className="how-it-jovens-section-main">
                <div className="how-it-img-div">
                  <img className="how-it-img-div-img" src="/images/how-4.png" alt="Supportive yoga community" />
                  <h3 className="how-it-img-title">Be part of a<br />supportive<br />community</h3>
                </div>
                <div className="how-it-content">
                  <p>Practice alongside a community that encourages your journey and celebrates your progress.</p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div data-aos="flip-left" className="how-it-jovens-section-main how-it-center-box">
                <h3>After 5 Days, Continue<br />For Just <span>₹29/Month.</span></h3>
                <p>Affordable expert guidance, personalized support, and live sessions designed to help you stay consistent.</p>
              </div>
            </div>

            <div className="col-lg-4 col-md-12">
              <div data-aos="flip-right" className="how-it-jovens-section-main how-it-button-box">
                <a href="#" className="how-it-btn">Try Free For 5 Days</a>
                <img className="try-for-border-absol" src="/images/how-border.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Watch Live Class tab/slider section */}
      <section className="joven-tab-slider-section">
        <div className="jts-container">
          <div data-aos="fade-up" className="jts-header">
            <span className="jts-eyebrow">SEE IT IN ACTION</span>
            <h2 className="jts-title">
              Watch how a live <span className="jts-accent">Jovens class works.</span>
            </h2>

            <div className="jts-tabs" role="tablist">
              {watchTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`jts-tab-btn${activeTab === tab.key ? " jts-active" : ""}`}
                  onClick={() => handleTabClick(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {watchTabs.map((tab) => (
          <div
            key={tab.key}
            data-aos={tab.key === watchTabs[0].key ? "fade-left" : undefined}
            className={`jts-panel${activeTab === tab.key ? " jts-panel-active" : ""}`}
            data-panel={tab.key}
          >
            <div className="swiper jts-swiper" ref={(el) => (jtsSwiperEls.current[tab.key] = el)}>
              <div className="swiper-wrapper">
                {tab.slides.map((slide, index) => {
                  const slideKey = `${tab.key}-${index}`;
                  const isPlaying = playingSlide === slideKey;
                  return (
                    <div className="swiper-slide" key={slideKey}>
                      <div className="jts-card">
                        <div className={`jts-card-media${isPlaying ? " jts-playing" : ""}`}>
                          {isPlaying ? (
                            slide.type === "youtube" ? (
                              <iframe
                                src={`${slide.video}?autoplay=1&rel=0&playsinline=1`}
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                title={slide.title}
                              />
                            ) : (
                              <video src={slide.video} controls autoPlay playsInline />
                            )
                          ) : (
                            <>
                              <img src={slide.img} alt={slide.alt} />
                              <button
                                className="jts-play-btn"
                                aria-label="Play video"
                                onClick={() => handlePlaySlide(tab.key, index)}
                              >
                                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              </button>
                            </>
                          )}
                        </div>
                        <h3 className="jts-card-title">{slide.title}</h3>
                        <p className="jts-card-desc">{slide.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="jts-controls">
              <div className="jts-prev" ref={(el) => (jtsPrevEls.current[tab.key] = el)}>&#8249;</div>
              <div className="jts-progress"><span ref={(el) => (jtsProgressEls.current[tab.key] = el)}></span></div>
              <div className="jts-next" ref={(el) => (jtsNextEls.current[tab.key] = el)}>&#8250;</div>
            </div>
          </div>
        ))}
      </section>

      {/* Breathing section */}
      <section className="jovens-breath-section">
        <div className="left-bottom-abso-img-div">
          <img className="left-bottom-abso-img" src="/images/lotus.png" alt="" />
        </div>

        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div data-aos="zoom-in" className="jovens-breath-section-main">
                <div className="jbs-circle-wrap">
                  <span className="jbs-ring jbs-ring-1"></span>
                  <span className="jbs-ring jbs-ring-2"></span>
                  <span className="jbs-ring jbs-ring-3"></span>
                  <span className="jbs-core"></span>
                </div>

                <h2 data-aos="fade-up" className="jbs-title">Breathe in... Breathe out...</h2>
                <p data-aos="fade-up" className="jbs-subtitle">Follow the rhythm of the circles</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="wyg-section">
        <div data-aos="fade-right" className="wyg-header">
          <span className="wyg-eyebrow">Everything included</span>
          <h2 className="wyg-title">What <span className="wyg-accent">you get.</span></h2>
          <p className="wyg-desc">
            A complete yoga experience designed to support your growth and consistency.
          </p>
        </div>

        <div data-aos="fade-left" className="wyg-carousel-wrap" ref={wygWrapRef}>
          <div className="wyg-track-outer" ref={wygOuterRef}>
            <div className="wyg-track" ref={wygTrackRef}>
              {wygCards.map((card, i) => (
                <div className="wyg-card" key={i}>
                  <div className="wyg-card-media">
                    <img src={card.img} alt={card.alt} />
                  </div>
                  <h3 className="wyg-card-title">{card.title}</h3>
                  <p className="wyg-card-desc">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="wyg-nav">
            <button style={{ display: "none" }} className="wyg-prev" aria-label="Scroll left" ref={wygPrevRef}>&#8249;</button>
            <button style={{ display: "none" }} className="wyg-next" aria-label="Scroll right" ref={wygNextRef}>&#8250;</button>
          </div>
        </div>
      </section>

      {/* Is This For You */}
      <section className="joven-is-section">
        <div className="container">
          <div className="joven-is-heading">
            <h2 data-aos="fade-up">Is This <span>For You?</span></h2>
          </div>

          <div className="main-is-re-main">
            <img data-aos="zoom-in" className="main-is-re-main-absoute-img jovens-float-img" src="/images/yoga-men.png" alt="Yoga" />

            <div className="joven-is-section-background">
              <div data-aos="fade-right" className="joven-is-section-left">
                <h3>Jovens Yoga Is Perfect For You If...</h3>
                <ul>
                  <li>You have a busy schedule but want a consistent yoga practice</li>
                  <li>You are a beginner looking for safe, guided instruction</li>
                  <li>You are returning to your wellness journey and want supportive guidance</li>
                  <li>You value personalized feedback and expert coaching</li>
                  <li>You want structure, accountability, and steady progress</li>
                </ul>
              </div>

              <div className="joven-is-section-right">
                <img src="/images/lo-yellow.png" alt="Lotus" />
              </div>
            </div>
          </div>

          <div className="second-row-yoga">
            <div className="main-is-re-main">
              <img className="main-is-re-main-absoute-img-r jovens-float-img" src="/images/yoga-girl.png" alt="Yoga" />

              <div className="joven-is-section-background-r">
                <div className="joven-is-section-right">
                  <img src="/images/lo-green.png" alt="Lotus" />
                </div>

                <div data-aos="fade-left" className="joven-is-section-left-r">
                  <h3>Jovens Yoga Is Perfect For You If...</h3>
                  <ul>
                    <li>You have a busy schedule but want a consistent yoga practice</li>
                    <li>You are a beginner looking for safe, guided instruction</li>
                    <li>You are returning to your wellness journey and want supportive guidance</li>
                    <li>You value personalized feedback and expert coaching</li>
                    <li>You want structure, accountability, and steady progress</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instructors */}
      <section className="jovens-indu-section">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <span data-aos="fade-up" className="jovens-sub-title">YOGA EXPERTS</span>
              <h2 data-aos="fade-up" className="jovens-main-title">Meet Our <span>Instructors</span></h2>
            </div>
          </div>

          <div className="row g-4 mt-2">
            {instructors.map((instructor, i) => (
              <div className="col-lg-3 col-md-6" key={instructor.name}>
                <div data-aos={i % 2 === 0 ? "flip-right" : "flip-left"} data-aos-duration={i % 2 === 0 ? undefined : "900"} className="jovens-indu-card">
                  <img src={instructor.img} className="jovens-indu-img" alt="" />
                  <div className={`jovens-overlay ${instructor.overlay}`}></div>
                  <div className="jovens-content">
                    <h4>{instructor.name}</h4>
                    <p>{instructor.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Testimonials */}
      <section className="joven-testimon-section">
        <div className="container">
          <div className="row align-items-center mb-5">
            <div className="col-lg-6">
              <div data-aos="fade-right" className="joven-testimon-heading">
                <span>STUDENT STORIES</span>
                <h2>Real people. <span>Real results.</span></h2>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="joven-testimon-text">
                <p data-aos="fade-left">
                  From first-time beginners to busy professionals, our students are building
                  consistent habits and seeing real transformation through live guided sessions,
                  expert support, and a community that keeps them motivated every step of the way.
                </p>
              </div>
            </div>
          </div>

          <div data-aos="fade-up" ref={testimonialRef} className="owl-carousel joven-testimonial-slider">
            {testimonials.map((t) => (
              <div className={`joven-testimon-card ${t.cardClass}`} key={t.title}>
                <h4>{t.title}</h4>
                <p>{t.quote}</p>
                <div className="joven-stars">★★★★★</div>
                <span className="quote"><img className="quote-imgg" src={t.quoteImg} alt="" /></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-aos="fade-up" className="joven-faq-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="joven-faq-heading text-center">
                <span className="portr">COMMON QUESTIONS</span>
                <h2>Everything you <span className="pqq-sp">need to know</span></h2>
              </div>

              <div className="joven-faq-wrapper">
                {faqs.map((faq, i) => (
                  <div className={`joven-faq-item${openFaq === i ? " active" : ""}`} key={i}>
                    <div className="joven-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      <h3>{faq.q}</h3>
                      <i className={`fa-solid ${openFaq === i ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
                    </div>
                    <div className="joven-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="jovens-cta-section">
        <div className="jovens-marquee">
          <div className="jovens-marquee-track">
            JOVENS YOGA • JOVENS YOGA • JOVENS YOGA • JOVENS YOGA • JOVENS YOGA •
            JOVENS YOGA • JOVENS YOGA • JOVENS YOGA • JOVENS YOGA •
          </div>
        </div>

        <div className="container">
          <div className="jovens-cta-section-main">
            <div className="jovens-cta-overlay"></div>

            <div className="jovens-cta-content">
              <h2 data-aos="fade-up">
                A YEAR FROM NOW,
                <span>YOU'LL BE GLAD YOU STARTED TODAY.</span>
              </h2>

              <a data-aos="fade-up" href="#" className="jovens-cta-btn">Try Free For 5 Days</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="jovens-main-footer">
        <div className="container">
          <div className="joven-footer-main-grid">
            <div className="jovens-footer-col jovens-footer-about">
              <img data-aos="zoom-in" src="/images/jovens-logo.png" alt="Jovens Academy Logo" />
              <p data-aos="fade-up">
                Discover the joy of music.<br />
                Awaken the artist within you.<br />
                Learn anytime, anywhere.<br />
                Start your journey with Jovens today.
              </p>
            </div>

            <div data-aos="fade-up" className="jovens-footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About us</a></li>
                <li><a href="#">Courses</a></li>
                <li><a href="#">FAQ</a></li>
                <li><a href="#">Blogs</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms and Conditions</a></li>
              </ul>
            </div>

            <div data-aos="fade-up" className="jovens-footer-col">
              <h4>Our Lessons</h4>
              <ul>
                <li><a href="#">Piano</a></li>
                <li><a href="#">Guitar</a></li>
                <li><a href="#">Violin</a></li>
                <li><a href="#">Drums</a></li>
                <li><a href="#">Flute</a></li>
                <li><a href="#">Tabla</a></li>
                <li><a href="#">Carnatic Vocal</a></li>
                <li><a href="#">Hindustani Vocal</a></li>
                <li><a href="#">Western Vocal</a></li>
              </ul>
            </div>

            <div data-aos="fade-up" className="jovens-footer-col">
              <h4>Vocal</h4>
              <ul>
                <li><a href="#">Hindustani Vocals</a></li>
                <li><a href="#">Western Vocals</a></li>
                <li><a href="#">Carnatic Vocals</a></li>
                <li><a href="#">Bollywood Vocals</a></li>
                <li><a href="#">Malayalam Film Music</a></li>
                <li><a href="#">Tamil Film Music</a></li>
                <li><a href="#">Devotional Course</a></li>
                <li><a href="#">Telugu Film Music</a></li>
                <li><a href="#">Kannada Film Music</a></li>
              </ul>
            </div>

            <div data-aos="fade-up" className="jovens-footer-col jovens-footer-contact">
              <h4>Social Media</h4>
              <div data-aos="zoom-in" className="jovens-social-icons">
                <a href="#"><i className="bi bi-facebook"></i></a>
                <a href="#"><i className="bi bi-instagram"></i></a>
                <a href="#"><i className="bi bi-linkedin"></i></a>
              </div>
              <a href="mailto:info@jovensacademy.com">info@jovensacademy.com</a>
              <a href="tel:+1952000495">+1 959.200.0495</a>
            </div>
          </div>
        </div>

        <div className="jovens-footer-bottom">
          <div className="container jovens-footer-bottom-inner">
            <p>&copy; <span>{new Date().getFullYear()}</span> Jovens Academy. All rights reserved.</p>
            <ul className="jovens-footer-bottom-links">
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms and Conditions</a></li>
            </ul>
          </div>
        </div>
      </footer>

      <div
        className="insd-new-fix-so-section"
        style={{
          opacity: showWhatsApp ? 1 : 0,
          pointerEvents: showWhatsApp ? "auto" : "none",
          transition: "opacity 0.3s",
        }}
      >
        <a href="https://wa.me/9047661000" className="insd-new-fix-whatsapp" target="_blank" rel="noreferrer">
          <i className="fab fa-whatsapp"></i>
        </a>
      </div>
    </>
  );
}
