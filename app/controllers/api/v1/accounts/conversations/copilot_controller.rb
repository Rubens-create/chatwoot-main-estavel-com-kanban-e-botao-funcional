class Api::V1::Accounts::Conversations::CopilotController < Api::V1::Accounts::Conversations::BaseController

  def summarize
    # Tenta achar a configuração salva da integração openai ativa na conta
    hook = Current.account.hooks.find_by(app_id: 'openai')

    if hook.blank?
      return render json: { error: I18n.t('integrations.openai.errors.not_configured', default: 'A Integração OpenAI/Custom AI não está configurada para esta conta.') }, status: :unprocessable_entity
    end

    # Puxa mensagens da conversa que formam o contexto
    # Filtra apenas mensagens não-privadas (ou pode incluir privadas se desejar, aqui incluiremos info visíveis apenas)
    messages_query = @conversation.messages.where(private: false).where(message_type: [:incoming, :outgoing]).order(created_at: :asc)
    
    if messages_query.empty?
      return render json: { error: 'A conversa não possui mensagens suficientes para ser resumida.' }, status: :unprocessable_entity
    end

    # Concatena em texto corrido para enviar ao modelo
    conversation_text = messages_query.map do |m|
      sender_name = m.incoming? ? (@conversation.contact&.name || 'Cliente') : (m.sender&.name || 'Agente')
      "#{sender_name}: #{m.content}"
    end.join("\n")

    # Prepara o payload para a LLM na estrutura universal (OpenAI)
    # LlmBaseService já usa a chave, base_url e model configurados no Hook.
    payload = {
      'model' => hook.settings['model_name'].presence || 'gpt-3.5-turbo',
      'messages' => [
        { 'role' => 'system', 'content' => 'Você é um assistente de atendimento especialista. Seu objetivo é ler o histórico e fazer um RESUMO curto da conversa em tópicos, focando na solicitação do cliente.' },
        { 'role' => 'user', 'content' => conversation_text }
      ]
    }

    # Instancia o serviço de conexão com o Provedor Genérico informando o evento "summarize" para compatibilidade com o logger ou cacher da LlmBaseService
    service = Integrations::LlmBaseService.new(hook: hook, event: { 'name' => 'summarize', 'data' => { 'conversation_display_id' => @conversation.display_id } })
    
    begin
      response = service.execute_ruby_llm_request(payload)
      if response.is_a?(Hash) && response[:error].present?
        render json: { error: response[:error] }, status: :unprocessable_entity
      else
        render json: { summary: response[:message] || response['message'] }
      end
    rescue StandardError => e
      Rails.logger.error "Erro no Copilot Summarize: #{e.message}"
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
