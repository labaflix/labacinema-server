(function () {
  const state = {
    video: { key: null, uploading: false },
    poster: { key: null, uploading: false }
  };

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function setProgress(kind, percent) {
    const fill = document.getElementById(kind + 'Fill');
    const status = document.getElementById(kind + 'Status');
    const prog = document.getElementById(kind + 'Progress');
    prog.hidden = false;
    fill.style.width = percent + '%';
    status.textContent = percent + '%';
  }

  function setDone(kind, key) {
    document.getElementById(kind + 'Meta').hidden = false;
    document.getElementById(kind + 'Key').textContent = key;
    document.getElementById(kind + 'Drop').classList.add('done');
    state[kind].key = key;
    updateSubmit();
  }

  function setError(kind, msg) {
    const status = document.getElementById(kind + 'Status');
    status.textContent = '' + msg;
    status.classList.add('error');
  }

  function updateSubmit() {
    const btn = document.getElementById('submitBtn');
    const titleOk = document.querySelector('input[name="title"]').value.trim().length > 0;
    btn.disabled = !(state.video.key && state.poster.key && titleOk && !state.video.uploading && !state.poster.uploading);
  }

  function getPresignedUrl(filename, contentType) {
    return fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'video', filename, contentType })
    }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      return data;
    });
  }

  function getPresignedUrlForPoster(filename, contentType) {
    return fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'poster', filename, contentType })
    }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      return data;
    });
  }

  function uploadFile(file, kind) {
    if (!file) return;
    if (state[kind].uploading) return;

    state[kind].uploading = true;
    document.getElementById(kind + 'Drop').classList.remove('done');
    document.getElementById(kind + 'Meta').hidden = true;
    setProgress(kind, 0);
    updateSubmit();

    const contentType = file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
    const presignFn = kind === 'video' ? getPresignedUrl : getPresignedUrlForPoster;

    presignFn(file.name, contentType)
      .then(signed => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signed.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', contentType);

          xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setProgress(kind, pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(signed.key);
            } else {
              reject(new Error('Upload failed: HTTP ' + xhr.status));
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(file);
        });
      })
      .then(key => {
        state[kind].uploading = false;
        setDone(kind, key);
      })
      .catch(err => {
        state[kind].uploading = false;
        setError(kind, err.message);
        updateSubmit();
      });
  }

  // Wire up dropzones
  ['video', 'poster'].forEach(function (kind) {
    const drop = document.getElementById(kind + 'Drop');
    const input = document.getElementById(kind + 'Input');

    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => uploadFile(input.files[0], kind));

    ['dragenter', 'dragover'].forEach(ev => {
      drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragging'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
      drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragging'); });
    });
    drop.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0];
      uploadFile(f, kind);
    });
  });

  // Title input enables submit
  document.querySelector('input[name="title"]').addEventListener('input', updateSubmit);

  // Submit
  document.getElementById('movieForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById('formMsg');
    const btn = document.getElementById('submitBtn');

    btn.disabled = true;
    msg.textContent = 'Saving...';
    msg.className = 'nf-upload-msg';

    const data = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      year: form.year.value ? parseInt(form.year.value, 10) : null,
      genre: form.genre.value.trim(),
      vj: form.vj ? form.vj.value.trim() : null,
      slug: form.slug.value.trim() || null,
      video_key: state.video.key,
      poster_key: state.poster.key
    };

    fetch('/api/upload/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) throw new Error(res.error);
        msg.textContent = 'Movie saved! Redirecting...';
        msg.classList.add('success');
        setTimeout(() => { window.location.href = '/play/' + res.slug; }, 800);
      })
      .catch(err => {
        msg.textContent = '' + err.message;
        msg.classList.add('error');
        btn.disabled = false;
      });
  });
})();
