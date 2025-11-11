import "https://early.webawesome.com/webawesome@3.0.0-alpha.11/dist/components/dialog/dialog.js"
import("https://cdn.jsdelivr.net/npm/virto-components@0.1.11/dist/virto-components.min.js")

import SDK from "https://cdn.jsdelivr.net/npm/@virtonetwork/sdk@0.0.4-alpha.17/dist/esm/sdk.js";

import * as Sentry from "https://cdn.jsdelivr.net/npm/@sentry/browser@7.114.0/+esm"

const initSentry = () => {
  try {
    Sentry.init({
      dsn: "https://906bcc1f831254f30f2f252f1bf64d92@o4509987096166400.ingest.de.sentry.io/4509992114192464",
      environment: window.SENTRY_ENV || 'production',
      tracesSampleRate: 0.1,
      sampleRate: 1.0, 
      debug: false,
      release: "0.0.1",
      beforeSend(event) {
        event.contexts = {
          ...event.contexts
        };
        
        event.tags = {
          ...event.tags,
          component: 'virto-connect',
          version: '0.0.1'
        };
        
        if (window.VIRTO_USER_ID) {
          event.user = {
            id: window.VIRTO_USER_ID,
            username: window.VIRTO_USER_ID
          };
        }
        
        if (event.exception) {
          event.exception.values?.forEach(exception => {
            if (exception.stacktrace?.frames) {
              exception.stacktrace.frames.forEach(frame => {
                if (frame.filename) {
                  frame.filename = frame.filename.replace(/[?&]token=[^&]+/gi, '?token=***');
                }
              });
            }
          });
        }
        
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
        
        if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
          if (breadcrumb.data?.status_code >= 400) {
            breadcrumb.level = 'error';
            breadcrumb.message = `Network request failed: ${breadcrumb.data.method} ${breadcrumb.data.url}`;
          }
        }
        
        return breadcrumb;
      }
    });
    
    console.log('Sentry initialized for Virto Connect');
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
};

initSentry();

const tagFn = (fn) => (strings, ...parts) => fn(parts.reduce((tpl, value, i) => `${tpl}${strings[i]}${value}`, "").concat(strings[parts.length]))
const html = tagFn((s) => new DOMParser().parseFromString(`<template>${s}</template>`, 'text/html').querySelector('template'));
const css = tagFn((s) => s)
const DEFAULT_SERVER = 'https://demo.virto.one/api'

const dialogTp = html`
    <wa-dialog light-dismiss with-header with-footer>
        <header slot="label">
            <slot name="logo"></slot>
            <slot name="title"></slot>
        </header>
        <hr>
        <div id="content-slot"></div>
        <div id="buttons-slot" name="buttons"></div> 
    </wa-dialog>
`

const dialogCss = css`
:host, wa-dialog {
    font-family: 'Outfit', sans-serif !important;
    display: block;
    width: 100%;
}

* {
    color: var(--darkslategray) !important;
}

wa-dialog::part(base) {
    padding: 1rem;
    background: linear-gradient(180deg, rgba(255,255,255,0.745) 0%, rgba(255,255,255,0.634) 100%), radial-gradient(84.04% 109.28% at 10.3% 12.14%, color-mix(in srgb, var(--green) 64.6%, transparent) 0%, color-mix(in srgb, var(--lightgreen) 44.9%, transparent) 98.5%);
    border-radius: 12px;
    box-shadow: 0px 2px var(--Blurblur-3, 3px) -1px rgba(26, 26, 26, 0.08), 0px 1px var(--Blurblur-0, 0px) 0px rgba(26, 26, 26, 0.08);
    width: min(90%, 500px);
    margin: 50px auto;
}

#content-slot {
    max-height: 70vh;
    overflow-y: auto;
    padding: 0.5rem;
}

#buttons-slot {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

hr { 
    border-top: 1px solid var(--lightgreen);
    margin: 1rem 0;
}

[slot="label"] {
    display: flex;
    align-items: center;
    gap: 1rem;
}

fieldset {
    border: none;
    margin-bottom: 1rem;
    padding: 0;
    width: 100%;
}

virto-button {
  //prevents the odd outline till we solve it from the component itself
    border: 2px solid transparent;
}

virto-input:focus {
    outline: none;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.error {
  display: none; 
  color: #d32f2f !important; 
  margin-bottom: 10px;
}

.disclaimer {
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  font-size: 0.8rem;
  color: #ff8c00 !important;
  line-height: 1.4;
  text-align: center;
}

.disclaimer-icon {
  display: inline-block;
  margin-right: 6px;
  vertical-align: middle;
}

.alternative-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.link {
  text-align: center; 
  position: relative; 
  z-index: 2; 
  margin-bottom: 24px;
}

.link__text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin: 0;
}

.divider {
  position: relative;
  z-index: 2;
  margin: 28px 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.divider__line {
  flex: 1;
  height: 1px;
  border-top: 1px solid var(--lightgreen);
}

.divider__text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 500;
}

.collapse {
  cursor: pointer;
}

.collapse__container {
  text-align: center;
  margin: 0;
  font-size: 0.85rem;
  color: #888;
  list-style: none;
  padding: 12px;
  user-select: none;
  outline: none;
  background: white;
  border-radius: 12px;
}

.collapse__title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.collapse__option {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.collapse__button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f0f0f0;
  color: #999;
  cursor: not-allowed;
  font-size: 12px;
  opacity: 0.7;
}

.coming-soon {
  font-size: 10px;
  color: #999;
  margin-left: auto;
}
`

const registerFormTemplate = html`
    <form id="register-form">
        <fieldset>
            <virto-input value="" label="Name" placeholder="Enter your name" name="name" type="text" required></virto-input>
            <virto-input value="" label="Username" placeholder="Enter your username" name="username" type="text" required></virto-input>
        </fieldset>
        <div id="register-error" class="error"></div>
        <!-- Testnet Disclaimer -->
        <div class="disclaimer">
            <span class="disclaimer-icon">⚠️</span>
            <strong>Testnet Notice:</strong> Due to testnet instability, authentication transactions may occasionally fail. If this happens, please wait a few minutes and try again.
        </div>
        <!-- Sign Up Link -->
        <div class="link">
            <p class="link__text">
                Need an account? 
                <a href="#" id="go-to-login">Sign In</a>
            </p>
        </div>
        <!-- Divider -->
        <div class="divider" >
            <div class="divider__line"></div>
            <span class="divider__text">or</span>
            <div class="divider__line"></div>
        </div>
        <div class="alternative-form">
          <!-- Social Login Section -->
          <div class="social-login-section">
              <details class="collapse">
                  <summary class="collapse__container">
                      <span class="collapse__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                          Or connect with social accounts
                      </span>
                  </summary>
                  <div class="collapse__option">
                      <button type="button" class="collapse__button" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Continue with Facebook
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24">
                              <path fill="#999" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#999" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#999" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#999" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                          Continue with Apple
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                          </svg>
                          Continue with Microsoft
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          Continue with GitHub
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          Continue with LinkedIn
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                  </div>
              </details>
          </div>
          
          <!-- Wallet Connection Section -->
          <div class="wallet-section">
              <details class="collapse">
                  <summary class="collapse__container">
                      <span class="collapse__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                          Or connect your wallet
                      </span>
                  </summary>
                  <div class="collapse__option">
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 2501 2500" fill="none">
                              <polygon fill="#959595" points="2376.9,93.8 1400.2,816.4 1581.8,390.5"></polygon>
                              <polygon fill="#959595" points="124.2,93.8 1092.1,823.2 919.2,390.5"></polygon>
                              <polygon fill="#959595" points="2025.2,1769.3 1765.4,2166.3 2321.8,2319.5 2481.2,1778"></polygon>
                              <polygon fill="#959595" points="20.8,1778 179.2,2319.5 734.7,2166.3 475.8,1769.3"></polygon>
                              <polygon fill="#959595" points="704.7,1098.7 550.2,1331.9 1100.8,1357 1082.4,764.4"></polygon>
                              <polygon fill="#959595" points="1796.3,1098.7 1412.8,757.7 1400.2,1357 1950.8,1331.9"></polygon>
                              <polygon fill="#959595" points="734.7,2166.3 1067.9,2005.4 781,1781.9"></polygon>
                              <polygon fill="#959595" points="1433.1,2005.4 1765.4,2166.3 1720,1781.9"></polygon>
                              <polygon fill="#C4C4C4" points="1765.4,2166.3 1433.1,2005.4 1460.1,2221.2 1457.2,2312.8"></polygon>
                              <polygon fill="#C4C4C4" points="734.7,2166.3 1043.8,2312.8 1041.9,2221.2 1067.9,2005.4"></polygon>
                              <polygon fill="#313131" points="1049.6,1639.3 773.3,1558.3 968.4,1468.7"></polygon>
                              <polygon fill="#313131" points="1451.4,1639.3 1532.6,1468.7 1728.7,1558.3"></polygon>
                              <polygon fill="#828282" points="734.7,2166.3 783,1769.3 475.8,1778"></polygon>
                              <polygon fill="#828282" points="1718,1769.3 1765.4,2166.3 2025.2,1778"></polygon>
                              <polygon fill="#828282" points="1950.8,1331.9 1400.2,1357 1451.4,1639.3 1532.5,1468.7 1728.7,1558.3"></polygon>
                              <polygon fill="#828282" points="773.3,1558.3 968.4,1468.7 1049.6,1639.3 1100.8,1357 550.2,1331.9"></polygon>
                              <polygon fill="#959595" points="550.2,1331.9 781,1781.9 773.3,1558.3"></polygon>
                              <polygon fill="#959595" points="1728.7,1558.3 1720,1781.9 1950.8,1331.9"></polygon>
                              <polygon fill="#959595" points="1100.8,1357 1049.6,1639.3 1114.3,1972.6 1128.8,1533.3"></polygon>
                              <polygon fill="#959595" points="1400.2,1357 1373.2,1532.3 1386.7,1972.6 1451.4,1639.3"></polygon>
                              <polygon fill="#A4A4A4" points="1451.4,1639.3 1386.7,1972.6 1433.1,2005.4 1720,1781.9 1728.7,1558.3"></polygon>
                              <polygon fill="#A4A4A4" points="773.3,1558.3 781,1781.9 1067.9,2005.4 1114.3,1972.6 1049.6,1639.3"></polygon>
                              <polygon fill="#B0B0B0" points="1457.2,2312.8 1460.1,2221.2 1435,2200 1066,2200 1041.9,2221.2 1043.8,2312.8 734.7,2166.3 842.9,2255 1062.1,2406.2 1437.9,2406.2 1658.1,2255 1765.4,2166.3"></polygon>
                              <polygon fill="#131313" points="1433.1,2005.4 1386.7,1972.6 1114.3,1972.6 1067.9,2005.4 1041.8,2221.2 1066,2200 1435,2200 1460.1,2221.2"></polygon>
                              <polygon fill="#4D4D4D" points="2418.4,863.6 2500.5,464.7 2376.8,93.8 1433.1,792.4 1796.3,1098.7 2309.2,1248.1 2422.3,1116.1 2373,1080.4 2451.2,1009.1 2391.3,962.9 2469.6,903.1"></polygon>
                              <polygon fill="#4D4D4D" points="0.5,464.7 83.6,863.6 30.5,903.1 109.7,962.9 49.8,1009.1 128,1080.4 78.7,1116.1 191.8,1248.1 704.7,1098.7 1067.9,792.4 124.2,93.8"></polygon>
                              <polygon fill="#A4A4A4" points="2309.2,1248.1 1796.3,1098.7 1950.8,1331.9 1720,1781.9 2025.2,1778 2481.2,1778"></polygon>
                              <polygon fill="#A4A4A4" points="704.7,1098.7 191.8,1248.1 20.8,1778 475.8,1778 781,1781.9 550.2,1331.9"></polygon>
                              <polygon fill="#A4A4A4" points="1400.2,1357 1433.1,792.3 1581.8,390.5 919.2,390.5 1067.9,792.3 1100.8,1357 1113.3,1534.2 1114.3,1972.6 1386.7,1972.6 1387.7,1534.2"></polygon>
                          </svg>
                          Connect MetaMask
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                              <path fill="#737373" fill-rule="evenodd" d="m33.879 35.117-.5 19.165c8.107 4.168 15.75 4.075 24.74 2.063 3.56-1.397 6.056-1.702 9.511 0 9.067 2.816 16.969 1.95 25.185-2.243l-.485-19.187c0-10.805-7.004-14.962-14.632-12.739-.779.232-1.944 1.274-1.944 2.207l-.181 18.733a1.77 1.77 0 1 1-3.538-.015V20.067a8.838 8.838 0 0 0-17.675 0V43.1a1.77 1.77 0 1 1-3.538.015l-.176-18.743c0-.923-1.109-1.96-1.882-2.192-8.8-2.61-14.88 2.538-14.88 12.936Zm2.475 23.843a48.43 48.43 0 0 1-5.209-2.254c-4.73-2.269-12.095-1.562-17.072 4.111-2.274 2.6-.515 6.36 2.77 7.448 1.583.526 3.017 1.413 4.353 2.408l.464.336c4.132 2.965 6.793 7.406 7.056 12.486l.253 4.812a31.616 31.616 0 0 0 19.428 25.959 38.59 38.59 0 0 0 29.327 0 31.616 31.616 0 0 0 19.429-25.959c.046-.825.061-1.65.051-2.465l.124-2.347c.263-5.08 2.924-9.52 7.056-12.486l.464-.336c1.34-.995 2.77-1.882 4.353-2.408 3.285-1.089 5.05-4.849 2.77-7.448-4.978-5.673-12.343-6.375-17.072-4.11-1.718.825-3.435 1.65-5.21 2.253l-3.62 1.238-.01.041c-6.654 1.842-12.12 1.847-18.398-.742-3.177-1.31-6.38-1.558-9.48 0-5.967 1.856-12.048 2.64-18.206.701l-3.626-1.238Zm26.665 44.732c13.39 0 24.241-15.596 24.241-15.596S76.41 72.499 63.02 72.499c-13.385 0-24.236 15.597-24.236 15.597s10.851 15.596 24.24 15.596Zm10.883-15.596c0 6.01-4.872 10.882-10.883 10.882-6.01 0-10.882-4.872-10.882-10.882s4.872-10.883 10.882-10.883 10.883 4.872 10.883 10.883Zm-10.883 4.936a4.936 4.936 0 1 0 0-9.872 4.936 4.936 0 0 0 0 9.872Z"/>
                          </svg>
                          Connect Talisman
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 593 493" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M70.0546 493C145.604 493 202.38 427.297 236.263 375.378C232.142 386.865 229.852 398.351 229.852 409.378C229.852 439.703 247.252 461.297 281.592 461.297C328.753 461.297 379.119 419.946 405.218 375.378C403.386 381.811 402.471 387.784 402.471 393.297C402.471 414.432 414.375 427.757 438.643 427.757C515.108 427.757 592.03 292.216 592.03 173.676C592.03 81.3243 545.327 0 428.112 0C222.069 0 0 251.784 0 414.432C0 478.297 34.3405 493 70.0546 493ZM357.141 163.568C357.141 140.595 369.962 124.514 388.734 124.514C407.049 124.514 419.87 140.595 419.87 163.568C419.87 186.541 407.049 203.081 388.734 203.081C369.962 203.081 357.141 186.541 357.141 163.568ZM455.126 163.568C455.126 140.595 467.947 124.514 486.719 124.514C505.034 124.514 517.855 140.595 517.855 163.568C517.855 186.541 505.034 203.081 486.719 203.081C467.947 203.081 455.126 186.541 455.126 163.568Z" fill="#6B6B6B"/>
                          </svg>
                          Connect Phantom
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">
                              <path stroke="#6B6B6B" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="12" d="M95.958 22C121.031 42.867 149.785 42 158 42c-1.797 118.676-15 95-62.042 128C49 137 35.798 160.676 34 42c8.13 0 36.883.867 61.958-20Z"/>
                          </svg>
                          Connect Trust Wallet
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                  </div>
              </details>
          </div>
        </div>
    </form>
`;

const loginFormTemplate = html`
    <form id="login-form">
        <fieldset>
            <virto-input value="" label="Username" placeholder="Enter your username" name="username" type="text" required></virto-input>
        </fieldset>
        <div id="login-error" class="error"></div>
        <!-- Testnet Disclaimer -->
        <div class="disclaimer">
            <span class="disclaimer-icon">⚠️</span>
            <strong>Testnet Notice:</strong> Due to testnet instability, authentication transactions may occasionally fail. If this happens, please wait a few minutes and try again.
        </div>
        <!-- Sign Up Link -->
        <div class="link">
            <p class="link__text">
                Need an account? 
                <a href="#" id="go-to-register">Sign Up</a>
            </p>
        </div>
        <!-- Divider -->
        <div class="divider" >
            <div class="divider__line"></div>
            <span class="divider__text">or</span>
            <div class="divider__line"></div>
        </div>
        <div class="alternative-form">
          <!-- Social Login Section -->
          <div class="social-login-section">
              <details class="collapse">
                  <summary class="collapse__container">
                      <span class="collapse__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                          Or connect with social accounts
                      </span>
                  </summary>
                  <div class="collapse__option">
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Continue with Facebook
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24">
                              <path fill="#999" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#999" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#999" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#999" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Continue with Google
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                          Continue with Apple
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                          </svg>
                          Continue with Microsoft
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          Continue with GitHub
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          Continue with LinkedIn
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                  </div>
              </details>
          </div>
          
          <!-- Wallet Connection Section -->
          <div class="wallet-section">
              <details class="collapse">
                  <summary class="collapse__container">
                      <span class="collapse__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                          Or connect your wallet
                      </span>
                  </summary>
                  <div class="collapse__option">
                      <button type="button" class="collapse__button disabled">
                          <svg width="16" height="16" viewBox="0 0 2501 2500" fill="none">
                              <polygon fill="#959595" points="2376.9,93.8 1400.2,816.4 1581.8,390.5"></polygon>
                              <polygon fill="#959595" points="124.2,93.8 1092.1,823.2 919.2,390.5"></polygon>
                              <polygon fill="#959595" points="2025.2,1769.3 1765.4,2166.3 2321.8,2319.5 2481.2,1778"></polygon>
                              <polygon fill="#959595" points="20.8,1778 179.2,2319.5 734.7,2166.3 475.8,1769.3"></polygon>
                              <polygon fill="#959595" points="704.7,1098.7 550.2,1331.9 1100.8,1357 1082.4,764.4"></polygon>
                              <polygon fill="#959595" points="1796.3,1098.7 1412.8,757.7 1400.2,1357 1950.8,1331.9"></polygon>
                              <polygon fill="#959595" points="734.7,2166.3 1067.9,2005.4 781,1781.9"></polygon>
                              <polygon fill="#959595" points="1433.1,2005.4 1765.4,2166.3 1720,1781.9"></polygon>
                              <polygon fill="#C4C4C4" points="1765.4,2166.3 1433.1,2005.4 1460.1,2221.2 1457.2,2312.8"></polygon>
                              <polygon fill="#C4C4C4" points="734.7,2166.3 1043.8,2312.8 1041.9,2221.2 1067.9,2005.4"></polygon>
                              <polygon fill="#313131" points="1049.6,1639.3 773.3,1558.3 968.4,1468.7"></polygon>
                              <polygon fill="#313131" points="1451.4,1639.3 1532.6,1468.7 1728.7,1558.3"></polygon>
                              <polygon fill="#828282" points="734.7,2166.3 783,1769.3 475.8,1778"></polygon>
                              <polygon fill="#828282" points="1718,1769.3 1765.4,2166.3 2025.2,1778"></polygon>
                              <polygon fill="#828282" points="1950.8,1331.9 1400.2,1357 1451.4,1639.3 1532.5,1468.7 1728.7,1558.3"></polygon>
                              <polygon fill="#828282" points="773.3,1558.3 968.4,1468.7 1049.6,1639.3 1100.8,1357 550.2,1331.9"></polygon>
                              <polygon fill="#959595" points="550.2,1331.9 781,1781.9 773.3,1558.3"></polygon>
                              <polygon fill="#959595" points="1728.7,1558.3 1720,1781.9 1950.8,1331.9"></polygon>
                              <polygon fill="#959595" points="1100.8,1357 1049.6,1639.3 1114.3,1972.6 1128.8,1533.3"></polygon>
                              <polygon fill="#959595" points="1400.2,1357 1373.2,1532.3 1386.7,1972.6 1451.4,1639.3"></polygon>
                              <polygon fill="#A4A4A4" points="1451.4,1639.3 1386.7,1972.6 1433.1,2005.4 1720,1781.9 1728.7,1558.3"></polygon>
                              <polygon fill="#A4A4A4" points="773.3,1558.3 781,1781.9 1067.9,2005.4 1114.3,1972.6 1049.6,1639.3"></polygon>
                              <polygon fill="#B0B0B0" points="1457.2,2312.8 1460.1,2221.2 1435,2200 1066,2200 1041.9,2221.2 1043.8,2312.8 734.7,2166.3 842.9,2255 1062.1,2406.2 1437.9,2406.2 1658.1,2255 1765.4,2166.3"></polygon>
                              <polygon fill="#131313" points="1433.1,2005.4 1386.7,1972.6 1114.3,1972.6 1067.9,2005.4 1041.8,2221.2 1066,2200 1435,2200 1460.1,2221.2"></polygon>
                              <polygon fill="#4D4D4D" points="2418.4,863.6 2500.5,464.7 2376.8,93.8 1433.1,792.4 1796.3,1098.7 2309.2,1248.1 2422.3,1116.1 2373,1080.4 2451.2,1009.1 2391.3,962.9 2469.6,903.1"></polygon>
                              <polygon fill="#4D4D4D" points="0.5,464.7 83.6,863.6 30.5,903.1 109.7,962.9 49.8,1009.1 128,1080.4 78.7,1116.1 191.8,1248.1 704.7,1098.7 1067.9,792.4 124.2,93.8"></polygon>
                              <polygon fill="#A4A4A4" points="2309.2,1248.1 1796.3,1098.7 1950.8,1331.9 1720,1781.9 2025.2,1778 2481.2,1778"></polygon>
                              <polygon fill="#A4A4A4" points="704.7,1098.7 191.8,1248.1 20.8,1778 475.8,1778 781,1781.9 550.2,1331.9"></polygon>
                              <polygon fill="#A4A4A4" points="1400.2,1357 1433.1,792.3 1581.8,390.5 919.2,390.5 1067.9,792.3 1100.8,1357 1113.3,1534.2 1114.3,1972.6 1386.7,1972.6 1387.7,1534.2"></polygon>
                          </svg>
                          Connect MetaMask
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                              <path fill="#737373" fill-rule="evenodd" d="m33.879 35.117-.5 19.165c8.107 4.168 15.75 4.075 24.74 2.063 3.56-1.397 6.056-1.702 9.511 0 9.067 2.816 16.969 1.95 25.185-2.243l-.485-19.187c0-10.805-7.004-14.962-14.632-12.739-.779.232-1.944 1.274-1.944 2.207l-.181 18.733a1.77 1.77 0 1 1-3.538-.015V20.067a8.838 8.838 0 0 0-17.675 0V43.1a1.77 1.77 0 1 1-3.538.015l-.176-18.743c0-.923-1.109-1.96-1.882-2.192-8.8-2.61-14.88 2.538-14.88 12.936Zm2.475 23.843a48.43 48.43 0 0 1-5.209-2.254c-4.73-2.269-12.095-1.562-17.072 4.111-2.274 2.6-.515 6.36 2.77 7.448 1.583.526 3.017 1.413 4.353 2.408l.464.336c4.132 2.965 6.793 7.406 7.056 12.486l.253 4.812a31.616 31.616 0 0 0 19.428 25.959 38.59 38.59 0 0 0 29.327 0 31.616 31.616 0 0 0 19.429-25.959c.046-.825.061-1.65.051-2.465l.124-2.347c.263-5.08 2.924-9.52 7.056-12.486l.464-.336c1.34-.995 2.77-1.882 4.353-2.408 3.285-1.089 5.05-4.849 2.77-7.448-4.978-5.673-12.343-6.375-17.072-4.11-1.718.825-3.435 1.65-5.21 2.253l-3.62 1.238-.01.041c-6.654 1.842-12.12 1.847-18.398-.742-3.177-1.31-6.38-1.558-9.48 0-5.967 1.856-12.048 2.64-18.206.701l-3.626-1.238Zm26.665 44.732c13.39 0 24.241-15.596 24.241-15.596S76.41 72.499 63.02 72.499c-13.385 0-24.236 15.597-24.236 15.597s10.851 15.596 24.24 15.596Zm10.883-15.596c0 6.01-4.872 10.882-10.883 10.882-6.01 0-10.882-4.872-10.882-10.882s4.872-10.883 10.882-10.883 10.883 4.872 10.883 10.883Zm-10.883 4.936a4.936 4.936 0 1 0 0-9.872 4.936 4.936 0 0 0 0 9.872Z"/>
                          </svg>
                          Connect Talisman
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 593 493" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M70.0546 493C145.604 493 202.38 427.297 236.263 375.378C232.142 386.865 229.852 398.351 229.852 409.378C229.852 439.703 247.252 461.297 281.592 461.297C328.753 461.297 379.119 419.946 405.218 375.378C403.386 381.811 402.471 387.784 402.471 393.297C402.471 414.432 414.375 427.757 438.643 427.757C515.108 427.757 592.03 292.216 592.03 173.676C592.03 81.3243 545.327 0 428.112 0C222.069 0 0 251.784 0 414.432C0 478.297 34.3405 493 70.0546 493ZM357.141 163.568C357.141 140.595 369.962 124.514 388.734 124.514C407.049 124.514 419.87 140.595 419.87 163.568C419.87 186.541 407.049 203.081 388.734 203.081C369.962 203.081 357.141 186.541 357.141 163.568ZM455.126 163.568C455.126 140.595 467.947 124.514 486.719 124.514C505.034 124.514 517.855 140.595 517.855 163.568C517.855 186.541 505.034 203.081 486.719 203.081C467.947 203.081 455.126 186.541 455.126 163.568Z" fill="#6B6B6B"/>
                          </svg>
                          Connect Phantom
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                      
                      <button type="button" class="collapse__button disabled" disabled>
                          <svg width="16" height="16" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">
                              <path stroke="#6B6B6B" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="12" d="M95.958 22C121.031 42.867 149.785 42 158 42c-1.797 118.676-15 95-62.042 128C49 137 35.798 160.676 34 42c8.13 0 36.883.867 61.958-20Z"/>
                          </svg>
                          Connect Trust Wallet
                          <span class="coming-soon">Coming Soon</span>
                      </button>
                  </div>
              </details>
          </div>
        </div>
    </form>
`;

export class VirtoConnect extends HTMLElement {
  static TAG = "virto-connect"

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.shadowRoot.appendChild(dialogTp.content.cloneNode(true))
    const style = document.createElement("style")
    style.textContent = dialogCss
    this.shadowRoot.appendChild(style)

    this.dialog = this.shadowRoot.querySelector("wa-dialog")
    this.contentSlot = this.shadowRoot.querySelector("#content-slot")
    this.buttonsSlot = this.shadowRoot.querySelector("#buttons-slot")

    this.currentFormType = "register";
    this.sdk = null;
  }

  get serverUrl() {
    return this.getAttribute('server') || DEFAULT_SERVER;
  }

  set serverUrl(value) {
    this.setAttribute('server', value);
  }

  get providerUrl() {
    return this.getAttribute('provider-url') || '';
  }

  set providerUrl(value) {
    this.setAttribute('provider-url', value);
  }

  sdk() {
    return this.sdk
  }

  initSDK() {
    console.trace("INIT SDK with", this.providerUrl);

    if (!this.providerUrl) {
      console.warn("Provider URL not set. SDK initialization deferred.");
      if (window.Sentry) {
        Sentry.addBreadcrumb({
          message: 'SDK initialization deferred - no provider URL',
          level: 'warning',
          category: 'sdk'
        });
      }
      return;
    }

    try {
      this.sdk = new SDK({
        federate_server: this.serverUrl,
        provider_url: this.providerUrl,
        confirmation_level: 'submitted',
        onProviderStatusChange: (status) => {
          if (window.Sentry) {
            Sentry.addBreadcrumb({
              message: `Provider status changed to: ${status}`,
              level: 'info',
              category: 'provider'
            });
          }
          
          const customEvent = new CustomEvent('providerStatusChange', {
            detail: status,
            bubbles: true,
            composed: true
          });
          document.dispatchEvent(customEvent);
        }
      });

      this.sdk.onTransactionUpdate((event) => {
        console.log('event', event);
        
        if (window.Sentry) {
          Sentry.addBreadcrumb({
            message: `Transaction ${event.type}`,
            level: event.type === 'failed' ? 'error' : 'info',
            category: 'transaction',
            data: {
              type: event.type,
              transactionId: event.transaction?.id || 'unknown'
            }
          });
        }
        
        // Dispatch custom event for React components to listen to
        const customEvent = new CustomEvent('transactionUpdate', {
          detail: event,
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(customEvent);
        
        if (event.type === 'included') {
          console.log('Transaction included:', event.transaction);
        }
        if (event.type === 'finalized') {
          console.log('Transaction finalized:', event.transaction);
        }
        if (event.type === 'failed') {
          console.log('Transaction failed:', event.transaction);
          console.error('error', JSON.stringify(event.transaction));
          
          if (window.Sentry) {
            Sentry.captureException(new Error('Transaction failed'), {
              tags: {
                component: 'virto-connect',
                operation: 'transaction'
              },
              extra: {
                transaction: event.transaction,
                event: event
              }
            });
          }
        }
      });

      console.log(`Virto SDK initialized with server: ${this.serverUrl} and provider: ${this.providerUrl}`);
      
      if (window.Sentry) {
        Sentry.addBreadcrumb({
          message: 'SDK initialized successfully',
          level: 'info',
          category: 'sdk',
          data: {
            serverUrl: this.serverUrl,
            providerUrl: this.providerUrl
          }
        });
      }
      
    } catch (error) {
      console.error("Failed to initialize SDK:", error);
      
      if (window.Sentry) {
        Sentry.captureException(error, {
          tags: {
            component: 'virto-connect',
            operation: 'sdk-init'
          },
          extra: {
            serverUrl: this.serverUrl,
            providerUrl: this.providerUrl
          }
        });
      }
    }
  }

  connectedCallback() {
    this.currentFormType = this.getAttribute("form-type") || "register";
    
    const lastUserId = localStorage.getItem('lastUserId');
    console.log('lastUserId', lastUserId);
    if (lastUserId && lastUserId.trim() !== '') {
      this.currentFormType = "login";
    }

    console.log('currentFormType', this.currentFormType);
    
    this.renderCurrentForm();
  }

  renderCurrentForm() {
    this.contentSlot.innerHTML = "";

    let formTemplate;
    switch (this.currentFormType) {
      case "register":
        formTemplate = registerFormTemplate;
        break;
      case "login":
        formTemplate = loginFormTemplate;
        break;
    }

    this.contentSlot.appendChild(formTemplate.content.cloneNode(true));
    
    switch (this.currentFormType) {
      case "register":
        const nameInput = this.shadowRoot.querySelector('virto-input[name="name"]');
        const registerUsernameInput = this.shadowRoot.querySelector('virto-input[name="username"]');
        customElements.whenDefined('virto-input').then(() => {
          if (nameInput) {
            nameInput.value = "";
          }
          if (registerUsernameInput) {
            registerUsernameInput.value = "";
          }
        });
        break;
      case "login":
        const lastUserId = localStorage.getItem('lastUserId');
        if (lastUserId && lastUserId.trim() !== '') {
          const usernameInput = this.shadowRoot.querySelector('virto-input[name="username"]');
          if (usernameInput) {
            customElements.whenDefined('virto-input').then(() => {
              usernameInput.value = lastUserId;
            });
          }
        }
        break;
    }
    
    this.attachFormLinkEvents();
    this.updateButtons();

    this.updateDialogTitle();
  }

  showFaucetConfirmation(username) {
    // Store current user data for later use
    this.currentUsername = username;
    
    // Clear current content
    this.contentSlot.innerHTML = "";
    this.buttonsSlot.innerHTML = "";

    // Create iframe container
    const iframeContainer = document.createElement("div");
    iframeContainer.id = "faucet-iframe-container";
    iframeContainer.style.cssText = `
      width: 100%;
      min-height: 300px;
      max-height: 400px;
      border: 1px solid var(--lightgreen);
      border-radius: 8px;
      overflow: auto;
      background: white;
      display: flex;
      flex-direction: column;
    `;
    
    // Add iframe container to content slot
    this.contentSlot.appendChild(iframeContainer);

    // Dispatch event to parent application to handle iframe content
    this.dispatchEvent(new CustomEvent('faucet-iframe-ready', {
      bubbles: true,
      detail: { 
        username, 
        containerId: 'faucet-iframe-container',
        virtoConnectElement: this
      }
    }));
  }

  // Method to close and complete the faucet flow (called by parent application)
  completeFaucetFlowFromParent(accepted, result = null) {
    this.completeFaucetFlow(this.currentUsername, accepted, result);
  }

  // Method to get the iframe container (for parent application to control)
  getFaucetContainer() {
    return this.shadowRoot.querySelector('#faucet-iframe-container');
  }

  completeFaucetFlow(username, faucetAccepted, faucetResult = null) {
    // Clear content and show final success message
    this.contentSlot.innerHTML = "";
    this.buttonsSlot.innerHTML = "";

    const successMsg = document.createElement("div");
    if (faucetAccepted && faucetResult) {
      successMsg.textContent = "Success! Your welcome bonus has been added to your account. You can now sign in.";
    } else {
      successMsg.textContent = "Success! You can now sign in.";
    }
    successMsg.style.cssText = `
      color: #4caf50 !important;
      margin-bottom: 10px;
      text-align: center;
      padding: 1rem;
      background: #f1f8e9;
      border-radius: 8px;
    `;

    this.contentSlot.appendChild(successMsg);

    // Create final buttons
    const closeBtn = document.createElement("virto-button");
    closeBtn.setAttribute("label", "Close");
    closeBtn.addEventListener("click", () => this.close());
    this.buttonsSlot.appendChild(closeBtn);

    const signInBtn = document.createElement("virto-button");
    signInBtn.setAttribute("label", "Sign In Now");
    signInBtn.id = "sign-in-button";
    signInBtn.addEventListener("click", () => {
      this.currentFormType = "login";
      this.renderCurrentForm();
    });
    this.buttonsSlot.appendChild(signInBtn);

    // Dispatch final success event
    this.dispatchEvent(new CustomEvent('register-complete', {
      bubbles: true,
      detail: { 
        username, 
        faucetAccepted, 
        faucetResult 
      }
    }));
  }

  updateDialogTitle() {
    const title = this.currentFormType === "register" ? "Sign Up" : "Sign In";
    const existingTitle = this.querySelector('[slot="title"]');
    if (existingTitle) {
      existingTitle.textContent = title;
    } else {
      const titleElement = document.createElement("h2");
      titleElement.textContent = title;
      titleElement.slot = "title";
      this.appendChild(titleElement);
    }
  }

  attachFormLinkEvents() {
    const goToLogin = this.shadowRoot.querySelector("#go-to-login");
    if (goToLogin) {
      goToLogin.addEventListener("click", (e) => {
        e.preventDefault();
        this.currentFormType = "login";
        this.renderCurrentForm();
      });
    }

    const goToRegister = this.shadowRoot.querySelector("#go-to-register");
    if (goToRegister) {
        goToRegister.addEventListener("click", (e) => {
          e.preventDefault();
          this.currentFormType = "register";
          this.renderCurrentForm();
        });
    }
  }

  updateButtons() {
    this.buttonsSlot.innerHTML = "";

    const closeButton = document.createElement("virto-button");
    closeButton.setAttribute("data-dialog", "close");
    closeButton.setAttribute("label", "Close");
    closeButton.addEventListener("click", () => this.close());
    this.buttonsSlot.appendChild(closeButton);
    
    const actionButton = document.createElement("virto-button");
    actionButton.id = "action-button";

    if (this.currentFormType === "register") {
      actionButton.setAttribute("label", "Register");
      actionButton.addEventListener("click", async () => await this.submitFormRegister());
    } else {
      actionButton.setAttribute("label", "Sign In");
      actionButton.addEventListener("click", async () => await this.submitFormLogin());
    }

    this.buttonsSlot.appendChild(actionButton);
  }

  async submitFormRegister() {
    const form = this.shadowRoot.querySelector("#register-form");
    const registerButton = this.shadowRoot.querySelector("#action-button");
    console.log("Register button:", registerButton);
    
    // Start Sentry transaction for registration flow (only if Sentry is available)
    let transaction = null;
    try {
      if (window.Sentry && Sentry.startTransaction) {
        transaction = Sentry.startTransaction({
          name: 'User Registration',
          op: 'user.register'
        });
        
        Sentry.configureScope(scope => {
          scope.setTag('component', 'virto-connect');
          scope.setTag('operation', 'register');
        });
      }
    } catch (sentryError) {
      console.warn('Sentry not available for transaction tracking:', sentryError);
    }
    
    try {
      await customElements.whenDefined('virto-input');
      
      const nameInput = this.shadowRoot.querySelector('virto-input[name="name"]');
      const usernameInput = this.shadowRoot.querySelector('virto-input[name="username"]');
      
      const name = nameInput ? nameInput.value : "";
      const username = usernameInput ? usernameInput.value : "";

      console.log("Name from Input:", name);
      console.log("Username from Input:", username);
      
      if (window.Sentry) {
        Sentry.addBreadcrumb({
          message: 'Registration form validation started',
          level: 'info',
          category: 'validation',
          data: {
            hasName: !!name,
            hasUsername: !!username,
            nameLength: name.length,
            usernameLength: username.length
          }
        });
      }

      // Validate required fields
      if (!name || name.trim() === "") {
        const errorMsg = this.shadowRoot.querySelector("#register-error");
        if (errorMsg) {
          errorMsg.textContent = "Name is required. Please enter your name.";
          errorMsg.style.display = "block";
        }
        
        if (window.Sentry) Sentry.captureMessage('Registration validation failed - missing name', 'warning');
        if (transaction) {
          transaction.setStatus('invalid_argument');
          transaction.finish();
        }
        return;
      }

      if (!username || username.trim() === "") {
        const errorMsg = this.shadowRoot.querySelector("#register-error");
        if (errorMsg) {
          errorMsg.textContent = "Username is required. Please enter your username.";
          errorMsg.style.display = "block";
        }
        
        if (window.Sentry) Sentry.captureMessage('Registration validation failed - missing username', 'warning');
        if (transaction) {
          transaction.setStatus('invalid_argument');
          transaction.finish();
        }
        return;
      }

      // Clear any previous error messages
      const errorMsg = this.shadowRoot.querySelector("#register-error");
      if (errorMsg) {
        errorMsg.style.display = "none";
      }

      this.dispatchEvent(new CustomEvent('register-start', { bubbles: true }));
      registerButton.setAttribute("loading", "");
      registerButton.setAttribute("disabled", "");
      
      if (window.Sentry) {
        Sentry.addBreadcrumb({
          message: 'Registration process started',
          level: 'info',
          category: 'registration'
        });
      }

      // Check if user is already registered
      const registrationCheckSpan = transaction ? transaction.startChild({
        op: 'auth.check_registration',
        description: 'Check if user is already registered'
      }) : null;

      try {
        const isRegistered = await this.sdk.auth.isRegistered(username);
        console.log({ isRegistered })
        
        if (registrationCheckSpan) {
          registrationCheckSpan.setStatus('ok');
          registrationCheckSpan.finish();
        }
        
        if (isRegistered) {
          console.log(`User ${username} is already registered`);
          
          if (window.Sentry) {
            Sentry.captureMessage('Registration attempted for existing user', 'info', {
              extra: { username }
            });
          }

          this.buttonsSlot.innerHTML = "";

          const errorMsg = this.shadowRoot.querySelector("#register-error");
          if (errorMsg) {
            errorMsg.textContent = "This user is already registered. Please sign in instead.";
            errorMsg.style.display = "block";
          }

          this.dispatchEvent(new CustomEvent('register-error', {
            bubbles: true,
            detail: { error: "This user is already registered. Please sign in instead." }
          }));

          const cancelButton = document.createElement("virto-button");
          cancelButton.setAttribute("label", "Cancel");
          cancelButton.addEventListener("click", () => this.close());
          this.buttonsSlot.appendChild(cancelButton);

          const loginButton = document.createElement("virto-button");
          loginButton.setAttribute("label", "Continue with Sign In");
          loginButton.addEventListener("click", () => {
            errorMsg.remove();
            this.currentFormType = "login";
            this.renderCurrentForm();
          });
          this.buttonsSlot.appendChild(loginButton);

          if (transaction) {
            transaction.setStatus('already_exists');
            transaction.finish();
          }
          return;
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
        
        if (registrationCheckSpan) {
          registrationCheckSpan.setStatus('internal_error');
          registrationCheckSpan.finish();
        }
        
        if (window.Sentry) {
          Sentry.captureException(error, {
            tags: {
              component: 'virto-connect',
              operation: 'check-registration'
            },
            extra: { username }
          });
        }
      }

      const user = {
        profile: {
          id: username,
          name: name,
          displayName: username,
        },
        metadata: {},
      };
      
      // Actual registration
      const registrationSpan = transaction ? transaction.startChild({
        op: 'auth.register',
        description: 'Register new user'
      }) : null;

      try {
        console.log('Attempting to register user:', user);
        
        if (window.Sentry) {
          Sentry.addBreadcrumb({
            message: 'Starting SDK registration',
            level: 'info',
            category: 'registration',
            data: { username, name }
          });
        }
        
        const result = await this.sdk.auth.register(user);
        console.log('Registration successful:', result);
        
        if (registrationSpan) {
          registrationSpan.setStatus('ok');
          registrationSpan.finish();
        }
        
        localStorage.setItem('lastUserId', username);

        // console.log("Address:", result.address);
        
        if (window.Sentry) {
          Sentry.addBreadcrumb({
            message: 'Registration completed successfully',
            level: 'info',
            category: 'registration',
            data: { username }
          });
        }

        // Show faucet confirmation instead of direct success
        this.showFaucetConfirmation(username);

        this.dispatchEvent(new CustomEvent('register-success', { bubbles: true }));
        
        if (transaction) {
          transaction.setStatus('ok');
        }
        
      } catch (error) {
        console.error('Registration failed:', error);
        
        if (registrationSpan) {
          registrationSpan.setStatus('internal_error');
          registrationSpan.finish();
        }

        const errorMsg = this.shadowRoot.querySelector("#register-error");
        if (errorMsg) {
          errorMsg.textContent = "Registration failed. Please try again.";
          errorMsg.style.display = "block";
        }
        
        // Capture detailed registration error
        if (window.Sentry) {
          Sentry.captureException(error, {
            tags: {
              component: 'virto-connect',
              operation: 'register'
            },
            extra: {
              username,
              name,
              serverUrl: this.serverUrl,
              providerUrl: this.providerUrl,
              userAgent: navigator.userAgent,
              errorDetails: error.message || 'Unknown error'
            },
            fingerprint: ['virto-connect', 'registration-failed', username]
          });
        }

        this.dispatchEvent(new CustomEvent('register-error', {
          bubbles: true,
          detail: { error }
        }));
        
        if (transaction) {
          transaction.setStatus('internal_error');
        }
      }
    } catch (globalError) {
      console.error('Unexpected error in registration flow:', globalError);
      
      if (window.Sentry) {
        Sentry.captureException(globalError, {
          tags: {
            component: 'virto-connect',
            operation: 'register-flow'
          }
        });
      }
      
      if (transaction) {
        transaction.setStatus('internal_error');
      }
    } finally {
      if (registerButton) {
        registerButton.removeAttribute("loading");
        registerButton.removeAttribute("disabled");
      }
      
      if (transaction) {
        transaction.finish();
      }
    }
  }

  async submitFormLogin() {
    const form = this.shadowRoot.querySelector("#login-form");
    const loginButton = this.shadowRoot.querySelector("#action-button");
    console.log("Login button:", loginButton);
    
    // Start Sentry transaction for login flow (only if Sentry is available)
    let transaction = null;
    try {
      if (window.Sentry && Sentry.startTransaction) {
        transaction = Sentry.startTransaction({
          name: 'User Login',
          op: 'user.login'
        });
        
        Sentry.configureScope(scope => {
          scope.setTag('component', 'virto-connect');
          scope.setTag('operation', 'login');
        });
      }
    } catch (sentryError) {
      console.warn('Sentry not available for transaction tracking:', sentryError);
    }
    
    try {
      // Wait for custom elements to be defined and get values directly from inputs
      await customElements.whenDefined('virto-input');
      
      const usernameInput = this.shadowRoot.querySelector('virto-input[name="username"]');
      const username = usernameInput ? usernameInput.value : "";

      console.log("Username from Input:", username);
      
      if (window.Sentry) {
        Sentry.addBreadcrumb({
          message: 'Login form validation started',
          level: 'info',
          category: 'validation',
          data: {
            hasUsername: !!username,
            usernameLength: username.length
          }
        });
      }

      // Validate required fields
      if (!username || username.trim() === "") {
        const errorMsg = this.shadowRoot.querySelector("#login-error");
        if (errorMsg) {
          errorMsg.textContent = "Username is required. Please enter your username.";
          errorMsg.style.display = "block";
        }
        
        if (window.Sentry) Sentry.captureMessage('Login validation failed - missing username', 'warning');
        if (transaction) {
          transaction.setStatus('invalid_argument');
          transaction.finish();
        }
        return;
      }

      // Clear any previous error messages
      const errorMsg = this.shadowRoot.querySelector("#login-error");
      if (errorMsg) {
        errorMsg.style.display = "none";
      }

      loginButton.setAttribute("loading", "");
      loginButton.setAttribute("disabled", "");

      if (!this.sdk || !this.sdk.auth) {
        const errorMsg = document.createElement("div");
        errorMsg.textContent = "Please enable Demo Mode to initialize the connection.";
        errorMsg.className = "error-message";
        this.contentSlot.appendChild(errorMsg);
        
        if (window.Sentry) {
          Sentry.captureMessage('Login failed - SDK not initialized', 'error', {
            extra: {
              hasSDK: !!this.sdk,
              hasAuth: !!(this.sdk && this.sdk.auth),
              serverUrl: this.serverUrl,
              providerUrl: this.providerUrl
            }
          });
        }
        
        if (transaction) {
          transaction.setStatus('failed_precondition');
          transaction.finish();
        }
        return;
      }

      this.dispatchEvent(new CustomEvent('login-start', { bubbles: true }));
      
      localStorage.setItem('lastUserId', username);
      
      if (window.Sentry) {
        Sentry.addBreadcrumb({
          message: 'Login process started',
          level: 'info',
          category: 'login'
        });
      }
      
      // Actual login
      const loginSpan = transaction ? transaction.startChild({
        op: 'auth.connect',
        description: 'Connect user session'
      }) : null;
      
      try {
        if (window.Sentry) {
          Sentry.addBreadcrumb({
            message: 'Starting SDK login',
            level: 'info',
            category: 'login',
            data: { username }
          });
        }
        
        const result = await this.sdk.auth.connect(username);
        console.log('Login successful:', result);
        
        if (loginSpan) {
          loginSpan.setStatus('ok');
          loginSpan.finish();
        }

        const successMsg = document.createElement("div");
        successMsg.textContent = "Login successful!";
        successMsg.style.color = "#4caf50";
        successMsg.style.marginBottom = "10px";

        this.contentSlot.innerHTML = "";
        this.contentSlot.appendChild(successMsg);

        this.buttonsSlot.innerHTML = "";

        const closeBtn = document.createElement("virto-button");
        closeBtn.setAttribute("label", "Close");
        closeBtn.addEventListener("click", () => this.close());
        this.buttonsSlot.appendChild(closeBtn);
        
        if (window.Sentry) {
          Sentry.addBreadcrumb({
            message: 'Login completed successfully',
            level: 'info',
            category: 'login',
            data: { username }
          });
        }

        this.dispatchEvent(new CustomEvent('login-success', {
          bubbles: true,
          detail: {
            username
          }
        }));
        
        if (transaction) {
          transaction.setStatus('ok');
        }
        
      } catch (error) {
        console.error('Login failed:', error);
        
        if (loginSpan) {
          loginSpan.setStatus('internal_error');
          loginSpan.finish();
        }

        const errorMsg = this.shadowRoot.querySelector("#login-error");
        if (errorMsg) {
          errorMsg.textContent = "Login failed. Please check your username and try again.";
          errorMsg.style.display = "block";
        }
        
        // Capture detailed login error
        if (window.Sentry) {
          Sentry.captureException(error, {
            tags: {
              component: 'virto-connect',
              operation: 'login'
            },
            extra: {
              username,
              serverUrl: this.serverUrl,
              providerUrl: this.providerUrl,
              userAgent: navigator.userAgent,
              errorDetails: error.message || 'Unknown error'
            },
            fingerprint: ['virto-connect', 'login-failed', username]
          });
        }

        this.dispatchEvent(new CustomEvent('login-error', {
          bubbles: true,
          detail: { error }
        }));
        
        if (transaction) {
          transaction.setStatus('internal_error');
        }
      }
    } catch (globalError) {
      console.error('Unexpected error in login flow:', globalError);
      
      if (window.Sentry) {
        Sentry.captureException(globalError, {
          tags: {
            component: 'virto-connect',
            operation: 'login-flow'
          }
        });
      }
      
      if (transaction) {
        transaction.setStatus('internal_error');
      }
    } finally {
      if (loginButton) {
        loginButton.removeAttribute("loading");
        loginButton.removeAttribute("disabled");
      }
      
      if (transaction) {
        transaction.finish();
      }
    }
  }

  open() {
    this.dialog.open = true
  }

  close() {
    // Cleanup faucet listener if it exists
    if (this.faucetCleanup) {
      this.faucetCleanup();
      this.faucetCleanup = null;
    }
    this.dialog.open = false
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log({ name, oldValue, newValue, })
    if (name === "id" && this.shadowRoot) {
      this.updateDialogTitle();
    } else if (name === "logo") {
      this.updateLogo();
    } else if (name === "form-type" && oldValue !== newValue) {
      this.currentFormType = newValue || "login";
      if (this.shadowRoot) {
        this.renderCurrentForm();
      }
    } else if (name === "server" && oldValue !== newValue) {
      // Reinitialize SDK if the server attribute changes
      this.initSDK();
    } else if (name === "provider-url" && oldValue !== newValue) {
      console.log({ provider: newValue })
      // Reinitialize SDK if the provider URL changes
      this.initSDK();
    }
  }

  updateLogo() {
    const logoSlot = this.shadowRoot.querySelector('slot[name="logo"]')
    if (logoSlot) {
      const existingLogo = this.querySelector('[slot="logo"]')
      if (existingLogo) {
        existingLogo.remove()
      }

      const logoSrc = this.getAttribute("logo")
      if (logoSrc) {
        const avatar = document.createElement("virto-avatar")
        avatar.setAttribute("image", logoSrc)
        avatar.setAttribute("slot", "logo")
        this.appendChild(avatar)
      }
    }
  }

  static get observedAttributes() {
    return ["id", "logo", "form-type", "server", "provider-url"]
  }
}

await customElements.whenDefined("wa-dialog")
customElements.define(VirtoConnect.TAG, VirtoConnect)
