import '@things-factory/form-ui'
import '@things-factory/grist-ui'
import { i18next, localize } from '@things-factory/i18n-base'
import { client, gqlBuilder, isMobileDevice, ScrollbarStyles } from '@things-factory/shell'
import gql from 'graphql-tag'
import { css, html, LitElement } from 'lit-element'

export class CodeDetail extends localize(i18next)(LitElement) {
  static get styles() {
    return [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: white;
        }
        search-form {
          overflow: visible;
        }
        .grist {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
        }
        data-grist {
          overflow-y: hidden;
          flex: 1;
        }
        .button-container {
          padding: 10px 0 12px 0;
          text-align: center;
        }
        .button-container > button {
          background-color: var(--button-background-color);
          border: var(--button-border);
          border-radius: var(--button-border-radius);
          margin: var(--button-margin);
          padding: var(--button-padding);
          color: var(--button-color);
          font: var(--button-font);
          text-transform: var(--button-text-transform);
        }
        .button-container > button:hover,
        .button-container > button:active {
          background-color: var(--button-background-focus-color);
        }
      `
    ]
  }

  static get properties() {
    return {
      id: String,
      name: String,
      searchFields: Array,
      config: Object
    }
  }

  render() {
    return html`
      <search-form .fields=${this.searchFields} @submit=${e => this.dataGrist.fetch()}></search-form>

      <div class="grist">
        <data-grist
          .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
          .config=${this.config}
          .fetchHandler=${this.fetchHandler.bind(this)}
        ></data-grist>
      </div>

      <div class="button-container">
        <button @click=${this.save}>${i18next.t('button.save')}</button>
        <button @click=${this.delete}>${i18next.t('button.delete')}</button>
      </div>
    `
  }

  get searchForm() {
    return this.shadowRoot.querySelector('search-form')
  }

  get dataGrist() {
    return this.shadowRoot.querySelector('data-grist')
  }

  async firstUpdated() {
    this.searchFields = [
      {
        name: 'name',
        label: i18next.t('field.name'),
        type: 'text',
        props: {
          searchOper: 'i_like'
        }
      },

      {
        name: 'description',
        label: i18next.t('field.description'),
        type: 'text',
        props: {
          searchOper: 'i_like'
        }
      },
      {
        name: 'rank',
        label: i18next.t('field.rank'),
        type: 'number',
        props: {
          min: '0',
          searchOper: 'i_like'
        }
      }
    ]

    this.config = {
      rows: { selectable: { multiple: true } },
      columns: [
        { type: 'gutter', gutterName: 'dirty' },
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'string',
          name: 'name',
          record: { align: 'left', editable: true },
          header: i18next.t('field.name'),
          sortable: true,
          width: 120
        },
        {
          type: 'string',
          name: 'description',
          record: { align: 'left', editable: true },
          header: i18next.t('field.description'),
          sortable: true,
          width: 220
        },
        {
          type: 'integer',
          name: 'rank',
          record: { align: 'left', editable: true },
          header: i18next.t('field.rank'),
          sortable: true,
          width: 120
        },
        {
          type: 'object',
          name: 'updater',
          record: { align: 'left', editable: false },
          header: i18next.t('field.updater'),
          sortable: true,
          width: 150
        },
        {
          type: 'datetime',
          name: 'updatedAt',
          header: i18next.t('field.updated_at'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 150
        }
      ]
    }

    await this.updateComplete
    this.dataGrist.fetch()
  }

  async fetchHandler({ page, limit, sorters = [{ name: 'rank' }] }) {
    let filters = []
    if (this.id) {
      filters.push({
        name: 'common_code_id',
        operator: 'eq',
        value: this.id
      })
    }

    const response = await client.query({
      query: gql`
        query {
          commonCodeDetails(${gqlBuilder.buildArgs({
            filters: [...filters, ...this.searchForm.queryFilters],
            pagination: { page, limit },
            sortings: sorters
          })}) {
            items {
              id
              name
              description
              rank
              updatedAt
              updater{
                name
                description
              }
            }
            total
          }
        }
      `
    })

    if (!response.errors) {
      return {
        total: response.data.commonCodeDetails.total || 0,
        records: response.data.commonCodeDetails.items || []
      }
    }
  }

  async save() {
    const patches = this.getPatches()
    if (patches && patches.length) {
      const response = await client.query({
        query: gql`
          mutation {
            updateMultipleCommonCodeDetail(${gqlBuilder.buildArgs({
              patches
            })}) {
              name
            }
          }
        `
      })

      if (!response.errors) this.dataGrist.fetch()
    } else {
      CustomAlert({
        title: i18next.t('text.nothing_changed'),
        text: i18next.t('text.there_is_nothing_to_save')
      })
    }
  }

  async delete() {
    const ids = this.dataGrist.selected.map(record => record.id)
    if (ids && ids.length > 0) {
      const anwer = await CustomAlert({
        type: 'warning',
        title: i18next.t('button.delete'),
        text: i18next.t('text.are_your_sure'),
        confirmButton: { text: i18next.t('button.delete') },
        cancelButton: { text: i18next.t('button.cancel') }
      })

      if (!anwer.value) return

      const response = await client.query({
        query: gql`
          mutation {
            deleteCommonCodeDetails(${gqlBuilder.buildArgs({ ids })})
          }
        `
      })

      if (!response.errors) this.dataGrist.fetch()
    } else {
      CustomAlert({
        title: i18next.t('text.nothing_selected'),
        text: i18next.t('text.there_is_nothing_to_delete')
      })
    }
  }

  getPatches() {
    let patches = this.dataGrist.dirtyRecords
    if (patches && patches.length) {
      patches = patches.map(code => {
        let patchField = code.id ? { id: code.id } : {}
        const dirtyFields = code.__dirtyfields__
        for (let key in dirtyFields) {
          patchField[key] = dirtyFields[key].after
        }
        patchField.cuFlag = code.__dirty__

        return patchField
      })
    }

    return patches
  }
}

window.customElements.define('code-detail', CodeDetail)
