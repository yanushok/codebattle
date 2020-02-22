import React from 'react';
import cn from 'classnames';

const iconsToClass = {
  js: 'icon-nodejs',
  ts: 'icon-nodejs',
  golang: 'icon-go',
  cpp: 'icon-cplusplus',
  ruby: 'icon-ruby',
  elixir: 'icon-elixir',
  haskell: 'icon-haskell',
  clojure: 'icon-clojure',
  python: 'icon-python',
  php: 'icon-php-alt',
};

const LanguageIcon = ({ lang }) => <span className={cn('d-flex', iconsToClass[lang])} />;

export default LanguageIcon;
