import { html } from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin.js'
import { store, PageView } from '@things-factory/shell'

import logo from '../../assets/images/hatiolab-logo.png'

class CodeUiMain extends connect(store)(PageView) {
  static get properties() {
    return {
      codeUi: String
    }
  }
  render() {
    return html`
      <section>
        <h2>CodeUi</h2>
        <img src=${logo}></img>
      </section>
    `
  }

  stateChanged(state) {
    this.codeUi = state.codeUi.state_main
  }
}

window.customElements.define('code-ui-main', CodeUiMain)
