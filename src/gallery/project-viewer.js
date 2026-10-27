// Project documents keep their existing layout and Exit button, while the WebGL
// scene stays in this document. Removing the frame on close releases its media.
const PROJECT_PATHS = new Set([
  '/unify2d.html', '/vaccine2d.html', '/mac-lamp2d.html',
  '/virtual_cooking2d.html', '/kaffeemaschine2d.html', '/to.morrow2d.html',
])

export function installProjectViewer({ onOpen, onClose }) {
  const sceneUrl = location.href
  const viewerId = 'gallery-project-' + performance.timeOrigin
  let frame = null
  let closing = false
  let previousFocus = null

  function removeFrame() {
    if (!frame) return
    frame.remove()
    frame = null
    closing = false
    document.body.classList.remove('project-is-open')
    onClose()
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
  }

  function show(url) {
    if (frame) return
    previousFocus = document.activeElement
    onOpen()
    frame = document.createElement('iframe')
    frame.id = 'project-viewer'
    frame.title = 'Project case study'
    frame.setAttribute('allow', 'autoplay; fullscreen')
    // Give the embedded document a fresh cache key for this lifecycle. Old
    // cached project HTML loaded an Exit script that navigated the iframe.
    const embeddedUrl = new URL(url)
    embeddedUrl.searchParams.set('viewer', 'warm-v1')
    frame.src = embeddedUrl.href
    document.body.classList.add('project-is-open')
    document.body.appendChild(frame)
    frame.focus()
  }

  function close() {
    if (!frame || closing) return
    closing = true
    history.back()
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return
    if (event.data?.type === 'gallery-project-close') close()
  })
  window.addEventListener('popstate', event => {
    if (event.state?.galleryProjectViewer === viewerId) show(event.state.projectUrl)
    else removeFrame()
  })

  return {
    open(href) {
      const url = new URL(href, sceneUrl)
      if (url.origin !== location.origin || !PROJECT_PATHS.has(url.pathname) || url.searchParams.get('from') !== '3d') return false
      if (frame) return true
      // The real project URL remains bookmarkable. A refresh opens the normal
      // standalone document, whose Exit link still falls back to the scene.
      history.pushState({ galleryProjectViewer: viewerId, projectUrl: url.href }, '', url.href)
      show(url.href)
      return true
    },
    close,
    get isOpen() { return frame !== null },
  }
}
