# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Contacts::SyncLabelsFromConversationJob, type: :job do
  let(:account) { create(:account) }
  let(:contact) { create(:contact, account: account) }
  let(:inbox)   { create(:inbox, account: account) }
  let(:conversation) do
    create(:conversation, account: account, contact: contact, inbox: inbox)
  end

  describe '#perform' do
    context 'quando a conversa não existe' do
      it 'retorna sem erro' do
        expect { described_class.perform_now(0) }.not_to raise_error
      end
    end

    context 'quando a conversa não tem labels' do
      it 'não altera o contato' do
        expect { described_class.perform_now(conversation.id) }
          .not_to(change { contact.reload.label_list })
      end
    end

    context 'quando a conversa tem labels' do
      let(:label1) { create(:label, account: account) }
      let(:label2) { create(:label, account: account) }

      before do
        conversation.update!(label_list: [label1.title, label2.title])
      end

      it 'adiciona as labels da conversa ao contato' do
        described_class.perform_now(conversation.id)
        contact.reload
        expect(contact.label_list).to include(label1.title, label2.title)
      end

      it 'não remove labels que o contato já possuía' do
        existing_label = create(:label, account: account)
        contact.update!(label_list: [existing_label.title])

        described_class.perform_now(conversation.id)
        contact.reload

        expect(contact.label_list).to include(existing_label.title, label1.title, label2.title)
      end

      it 'não duplica labels já existentes no contato' do
        contact.update!(label_list: [label1.title])

        described_class.perform_now(conversation.id)
        contact.reload

        expect(contact.label_list.count(label1.title)).to eq(1)
      end
    end
  end
end
