class AddThemeColorToAccounts < ActiveRecord::Migration[7.0]
  def change
    add_column :accounts, :theme_color, :string, default: '#1F93FF'
  end
end
