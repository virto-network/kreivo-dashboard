import "https://early.webawesome.com/webawesome@3.0.0-alpha.11/dist/components/dialog/dialog.js"
import("https://cdn.jsdelivr.net/npm/virto-components@0.1.11/dist/virto-components.min.js")

import SDK from "https://cdn.jsdelivr.net/npm/@virtonetwork/sdk@0.0.4-alpha.34/dist/web/index.js";

import * as Sentry from "https://cdn.jsdelivr.net/npm/@sentry/browser@7.114.0/+esm"

const initSentry = () => {
  try {
    //     Sentry.init({
    //       dsn: "https://906bcc1f831254f30f2f252f1bf64d92@o4509987096166400.ingest.de.sentry.io/4509992114192464",
    //       environment: window.SENTRY_ENV || 'production',
    //       tracesSampleRate: 0.1,
    //       sampleRate: 1.0,
    //       debug: false,
    //       release: "0.0.1",
    //       beforeSend(event) {
    //         event.contexts = {
    //           ...event.contexts
    //         };
    // Z
    //         event.tags = {
    //           ...event.tags,
    //           component: 'virto-connect',
    //           version: '0.0.1'
    //         };

    //         if (window.VIRTO_USER_ID) {
    //           event.user = {
    //             id: window.VIRTO_USER_ID,
    //             username: window.VIRTO_USER_ID
    //           };
    //         }

    //         if (event.exception) {
    //           event.exception.values?.forEach(exception => {
    //             if (exception.stacktrace?.frames) {
    //               exception.stacktrace.frames.forEach(frame => {
    //                 if (frame.filename) {
    //                   frame.filename = frame.filename.replace(/[?&]token=[^&]+/gi, '?token=***');
    //                 }
    //               });
    //             }
    //           });
    //         }

    //         return event;
    //       },
    //       beforeBreadcrumb(breadcrumb) {
    //         if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
    //           return null;
    //         }

    //         if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
    //           if (breadcrumb.data?.status_code >= 400) {
    //             breadcrumb.level = 'error';
    //             breadcrumb.message = `Network request failed: ${breadcrumb.data.method} ${breadcrumb.data.url}`;
    //           }
    //         }

    //         return breadcrumb;
    //       }
    //     });

    //     console.log('Sentry initialized for Virto Connect');
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
};

initSentry();

const tagFn = (fn) => (strings, ...parts) => fn(parts.reduce((tpl, value, i) => `${tpl}${strings[i]}${value}`, "").concat(strings[parts.length]))
const html = tagFn((s) => new DOMParser().parseFromString(`<template>${s}</template>`, 'text/html').querySelector('template'));
const css = tagFn((s) => s)
const DEFAULT_SERVER = 'https://connect.virto.one/api'

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



        const address = result.address;
        this.dispatchEvent(new CustomEvent('login-success', {
          bubbles: true,
          detail: {
            username,
            address
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
