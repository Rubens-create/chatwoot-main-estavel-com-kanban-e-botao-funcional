class Api::V1::Accounts::Integrations::OpenaiController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def models
    begin
      api_key = params[:api_key]
      api_base_url = params[:api_base_url].presence

      unless api_key.present?
        render json: { error: 'API key is missing' }, status: :unprocessable_entity
        return
      end

      # Set global config to the provided credentials
      api_base_url_to_use = api_base_url.presence || InstallationConfig.find_by(name: 'CAPTAIN_OPEN_AI_ENDPOINT')&.value.presence || 'https://api.openai.com/'
      api_base_url_to_use = "#{api_base_url_to_use.chomp('/')}/v1" unless api_base_url.to_s.end_with?('/v1')

      models_list = []
      Llm::Config.with_api_key(api_key, api_base: api_base_url_to_use) do |context|
        # context here is basically RubyLLM configuration block, but we need to instantiate open_ai native client
        # or access it via context. The cleanest way in this wrapper might be to instantiate the raw ruby-openai client
        client = ::OpenAI::Client.new(
          access_token: api_key,
          uri_base: api_base_url_to_use
        )
        response = client.models.list
        
        # O provedor pode retornar erro (ex: credenciais invalidas)
        if response && response["data"]
          models_list = response["data"].map { |m| m["id"] }.compact.sort
        end
      end

      render json: { models: models_list }
    rescue StandardError => e
      Rails.logger.error "Error fetching models: #{e.message}"
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end

  private

  def check_authorization
    # Reutiliza o padrao de autorizacao de integracoes
    authorize(:integration_app, :create?)
  end
end
