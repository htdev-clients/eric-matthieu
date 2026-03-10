# Patch for jekyll_picture_tag 2.1.3: html_attributes.rb#parse_params calls
# `<<` on @attributes[key] which may be a Hash (pre-computed sizes from preset),
# not a String. Coerce to String before appending.
require 'jekyll_picture_tag'

module PictureTag
  module Parsers
    class HTMLAttributeSet
      private

      def parse_params(words)
        key = 'implicit'

        words.each do |word|
          if word.match(/^--/)
            key = word.delete_prefix('--')
          elsif @attributes[key]
            @attributes[key] = @attributes[key].to_s unless @attributes[key].is_a?(String)
            @attributes[key] << ' ' + word
          else
            @attributes[key] = word
          end
        end
      end
    end
  end
end
