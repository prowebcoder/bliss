

(function(){
  const wbsPack = {
    settings: {},
    animateSection: function(entries, observer){
      // Target the first entry available.
      let observedSection = entries[0];
      if (observedSection.isIntersecting) {
        observedSection.target.classList.add('wbs__animation-applied');
      }
    },
    playVideo: function(play_button){
      const video = play_button.previousElementSibling;
      const pause_button = play_button.nextElementSibling;
      video.play();
      play_button.classList.add('wbs__playing');
      pause_button.classList.add('wbs__playing')
      video.addEventListener("ended", (event) => {
        play_button.classList.remove('wbs__playing');
        pause_button.classList.remove('wbs__playing');
      });
    },
    pauseVideo: function(pause_button){
      const video = pause_button.parentElement.querySelector('.wbs__hosted-video');
      const play_button = pause_button.parentElement.querySelector('.wbs__play-button');
      video.pause();
      play_button.classList.remove('wbs__playing');
      pause_button.classList.remove('wbs__playing');
    },
    load: function(section){
      const play_buttons = section.querySelectorAll(`.wbs__play-button`);
      const pause_buttons = section.querySelectorAll(`.wbs__pause-button`);

      play_buttons.forEach((play_button) => {
        play_button.addEventListener('click', (e) => {
          this.playVideo(e.target)
        });
      });

      pause_buttons.forEach((pause_button) => {
        pause_button.addEventListener('click', (e) => {
          this.pauseVideo(e.target)
        });
      });

      if (this.settings.animation !== 'none'){
        const options = {
          root: null,
          rootMargin: '0px',
          threshold: [0, 0.25, 0.5, 0.75, 1]
        };
        // Construct Intersection Observer.
        const observer = new IntersectionObserver( this.animateSection, options );
        // Observe if element is present.
        if (section) {
          observer.observe(section);
        }
      }
    },
    unload: function(section){
      section.classList.remove('wbs__animation-applied')
    }
  }
  window.addEventListener('shopify:section:unload', function (e) {
    const settings = document.querySelector(`[data-wbs="${e.detail.sectionId}"]`);
    const sectionId = e.detail.sectionId;
    const section = document.querySelector(`#WP--${e.detail.sectionId}`);
    if (sectionId == wbsPack.settings.id){
      wbsPack.unload(section);
    }
  });
  wbsPack.settings = JSON.parse(document.querySelector('[data-wbs="{{ section.id }}"]').innerHTML);
  const sectionId = {{ section.id | json }};
  const section = document.querySelector(`#WP--${sectionId}`);
  if (sectionId == wbsPack.settings.id){
    wbsPack.load(section);
  }
})()
 