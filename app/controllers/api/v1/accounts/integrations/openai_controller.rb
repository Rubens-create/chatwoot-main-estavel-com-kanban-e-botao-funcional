require 'net/http'
require 'uri'
require 'json'

class Api::V1::Accounts::Integrations::OpenaiController < Api::V1::Accounts::BaseController
  def models
    api_key = params[:api_key]
    api_base_url = params[:api_base_url].presence || 'https://api.openai.com/v1'

    unless api_key.present?
      render json: { error: 'API key is missing' }, status: :unprocessable_entity
      return
    end

    # Normaliza a URL base
    api_base_url = api_base_url.chomp('/')
    api_base_url = "#{api_base_url}/v1" unless api_base_url.end_with?('/v1')
    models_url = "#{api_base_url}/models"

    # Faz a requisição direta com Net::HTTP (evita depender de gems terceiras)
    uri = URI.parse(models_url)
    http = ::Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == 'https')
    http.open_timeout = 10
    http.read_timeout = 15

    request = ::Net::HTTP::Get.new(uri.request_uri)
    request['Authorization'] = "Bearer #{api_key}"
    request['Content-Type'] = 'application/json'

    response = http.request(request)

    if response.code.to_i == 200
      body = JSON.parse(response.body)
      models_list = (body['data'] || []).map { |m| m['id'] }.compact.sort
      render json: { models: models_list }
    else
      error_body = JSON.parse(response.body) rescue { 'error' => response.body }
      render json: { error: error_body['error'] || "HTTP #{response.code}" }, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rails.logger.error "Error fetching models: #{e.message}"
    render json: { error: e.message }, status: :unprocessable_entity
  end
end
