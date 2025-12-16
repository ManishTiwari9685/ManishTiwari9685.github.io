// form.js - uses public APIs for Indian city autocomplete and pincode lookup
(() => {
  const cityInput = document.getElementById('city');
  const suggestions = document.getElementById('citySuggestions');
  const eventType = document.getElementById('eventType');
  const otherRow = document.getElementById('otherEventRow');
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  let debounceTimer = null;
  const MAX_SUG = 8;

  function isDigits(s){ return /^\d+$/.test(s); }

  function renderSuggestions(list){
    suggestions.innerHTML = '';
    if(!list.length){
      suggestions.style.display = 'none';
      suggestions.setAttribute('aria-hidden', 'true');
      return;
    }
    list.forEach(item => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.textContent = item.display;
      li.dataset.value = item.value;
      li.addEventListener('click', () => selectSuggestion(item));
      li.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') selectSuggestion(item);
      });
      suggestions.appendChild(li);
    });
    suggestions.style.display = 'block';
    suggestions.setAttribute('aria-hidden', 'false');
  }

  function selectSuggestion(item){
    cityInput.value = item.value;
    suggestions.innerHTML = '';
    suggestions.style.display = 'none';
  }

  async function fetchByPincode(pin){
    try{
      const res = await fetch('https://api.postalpincode.in/pincode/' + encodeURIComponent(pin));
      const json = await res.json();
      if(!Array.isArray(json) || !json[0] || json[0].Status !== 'Success') return [];
      const posts = json[0].PostOffice || [];
      const unique = [];
      const seen = new Set();
      posts.forEach(po => {
        const city = po.Name + (po.State ? (', ' + po.State) : '');
        if(!seen.has(city)){
          seen.add(city);
          unique.push({ display: city + ' — ' + pin, value: city });
        }
      });
      return unique.slice(0, MAX_SUG);
    }catch(err){
      console.warn('pincode lookup failed', err);
      return [];
    }
  }

  async function fetchByName(q){
    try{
      const url = 'https://api.teleport.org/api/cities/?search=' + encodeURIComponent(q) + '&limit=10';
      const res = await fetch(url);
      if(!res.ok) return [];
      const json = await res.json();
      const results = (json._embedded && json._embedded['city:search-results']) || [];
      const filtered = [];
      for(const r of results){
        const full = r.matching_full_name || '';
        // include only entries that include India
        if(full.toLowerCase().includes(', india')){
          // take part before the first comma as city name
          const cityName = full.split(',')[0].trim();
          filtered.push({ display: full, value: cityName });
          if(filtered.length >= MAX_SUG) break;
        }
      }
      return filtered;
    }catch(err){
      console.warn('city search failed', err);
      return [];
    }
  }

  function handleInput(e){
    const q = e.target.value.trim();
    if(debounceTimer) clearTimeout(debounceTimer);
    if(!q){
      suggestions.style.display = 'none';
      return;
    }
    debounceTimer = setTimeout(async () => {
      let matches = [];
      if(isDigits(q)){
        // require at least 3 digits to search pincode
        if(q.length >= 3){
          matches = await fetchByPincode(q);
        }
      } else {
        if(q.length >= 2){
          matches = await fetchByName(q);
        }
      }
      renderSuggestions(matches);
    }, 300);
  }

  cityInput.addEventListener('input', handleInput);
  cityInput.addEventListener('blur', () => setTimeout(() => {
    suggestions.style.display = 'none';
  }, 150));

  // Event type toggle
  eventType.addEventListener('change', (e) => {
    if(e.target.value === 'Others'){
      otherRow.style.display = 'block';
      document.getElementById('otherEvent').required = true;
    } else {
      otherRow.style.display = 'none';
      document.getElementById('otherEvent').required = false;
    }
  });

  // Submission
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if(!form.checkValidity()){
      form.reportValidity();
      status.textContent = 'Please complete the required fields.';
      status.style.color = 'crimson';
      return;
    }
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      mobile: form.mobile.value.trim(),
      city: form.city.value.trim(),
      eventType: form.eventType.value,
      otherEvent: form.otherEvent.value.trim(),
      message: form.message.value.trim()
    };

    // TODO: replace with actual submission endpoint (e.g., Netlify Forms, Formspree, or your API)
    status.style.color = 'green';
    status.textContent = 'Thank you — your enquiry has been received. (Demo)';
    console.log('Form payload (demo):', payload);
    setTimeout(() => { form.reset(); otherRow.style.display = 'none'; }, 1200);
  });

})();
