# frozen_string_literal: true

# Sincroniza as etiquetas (labels) de uma conversa para o contato associado.
# Executa de forma assíncrona para não travar o save da conversa.
# Estratégia: merge (union) — as labels da conversa são ADICIONADAS ao contato,
# sem remover etiquetas que o contato já possua de outras fontes.
class Contacts::SyncLabelsFromConversationJob < ApplicationJob
  queue_as :default

  def perform(conversation_id)
    conversation = Conversation.find_by(id: conversation_id)
    return if conversation.nil?

    contact = conversation.contact
    return if contact.nil?

    conversation_labels = conversation.label_list
    return if conversation_labels.blank?

    # Merge sem duplicatas: preserva labels existentes do contato
    merged_labels = (contact.label_list + conversation_labels).uniq
    contact.update!(label_list: merged_labels)
  end
end
