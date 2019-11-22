import '@things-factory/form-ui'
import '@things-factory/grist-ui'
import { i18next, localize } from '@things-factory/i18n-base'
import { openPopup } from '@things-factory/layout-base'
import { client, gqlBuilder, isMobileDevice, PageView, ScrollbarStyles } from '@things-factory/shell'
import gql from 'graphql-tag'
import { css, html } from 'lit-element'
import './code-detail'

class CodeList extends localize(i18next)(PageView) {
  static get properties() {
    return {
      searchFields: Array,
      config: Object,
      data: Object
    }
  }

  static get styles() {
    return [
      ScrollbarStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        search-form {
          overflow: visible;
        }
        .grist {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        data-grist {
          overflow-y: hidden;
          flex: 1;
        }
      `
    ]
  }

  render() {
    return html`
      <search-form .fields=${this.searchFields} @submit=${e => this.dataGrist.fetch()}></search-form>

      <div class="grist">
        <data-grist
          .mode=${isMobileDevice() ? 'LIST' : 'GRID'}
          .config=${this.config}
          .fetchHandler="${this.fetchHandler.bind(this)}"
        ></data-grist>
      </div>
    `
  }

  get context() {
    return {
      title: i18next.t('title.code_management'),
      actions: [
        {
          title: i18next.t('button.save'),
          action: this.save.bind(this)
        },
        {
          title: i18next.t('button.delete'),
          action: this.delete.bind(this)
        }
      ]
    }
  }

  get searchForm() {
    return this.shadowRoot.querySelector('search-form')
  }

  get dataGrist() {
    return this.shadowRoot.querySelector('data-grist')
  }

  pageUpdated(_changed, _lifecycle) {
    if (this.active) {
      this.dataGrist.fetch()
    }
  }

  pageInitialized() {
    this.searchFields = [
      {
        name: 'name',
        label: i18next.t('field.name'),
        type: 'text',
        props: { searchOper: 'i_like' }
      },
      {
        name: 'description',
        label: i18next.t('field.description'),
        type: 'text',
        props: { searchOper: 'i_like' }
      }
    ]

    this.config = {
      rows: { selectable: { multiple: true } },
      columns: [
        { type: 'gutter', gutterName: 'dirty' },
        { type: 'gutter', gutterName: 'sequence' },
        { type: 'gutter', gutterName: 'row-selector', multiple: true },
        {
          type: 'gutter',
          gutterName: 'button',
          icon: 'reorder',
          handlers: {
            click: (_columns, _data, _column, record, _rowIndex) => {
              if (record.id && record.name) this.openCodeDetail(record.id, record.name)
            }
          }
        },
        {
          type: 'string',
          name: 'name',
          header: i18next.t('field.name'),
          record: { editable: true, align: 'left' },
          sortable: true,
          width: 150
        },
        {
          type: 'string',
          name: 'description',
          header: i18next.t('field.description'),
          record: { editable: true, align: 'left' },
          sortable: true,
          width: 200
        },
        {
          type: 'datetime',
          name: 'updatedAt',
          header: i18next.t('field.updated_at'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 150
        },
        {
          type: 'object',
          name: 'updater',
          header: i18next.t('field.updater'),
          record: { editable: false, align: 'center' },
          sortable: true,
          width: 150
        }
      ]
    }
  }

  async fetchHandler({ page, limit, sorters = [{ name: 'name' }, { name: 'updatedAt' }] }) {
    const response = await client.query({
      query: gql`
        query {
          codes: commonCodes(${gqlBuilder.buildArgs({
            filters: this.searchForm.queryFilters,
            pagination: { page, limit },
            sortings: sorters
          })}) {
            items {
              id
              name
              description
              updatedAt
              updater{
                id
                name
                description
              }
            }
            total
          }
        }
      `
    })

    return {
      total: response.data.commonCodes.total || 0,
      records: response.data.commonCodes.items || []
    }
  }

  async save() {
    const patches = this.getPatches()
    if (patches && patches.length) {
      const response = await client.query({
        query: gql`
            mutation {
              updateMultipleCommonCode(${gqlBuilder.buildArgs({
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
            deleteCommonCodes(${gqlBuilder.buildArgs({ ids })})
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

  openCodeDetail(id, name) {
    openPopup(
      html`
        <code-detail .id="${id}" name="${name}"></code-detail>
      `,
      {
        backdrop: true,
        size: 'large',
        title: `${i18next.t('title.system_code_detail')} - ${name}`
      }
    )
  }
}

customElements.define('code-list', CodeList)
