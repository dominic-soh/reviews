import '@lynx-js/preact-devtools';
import '@lynx-js/react/debug';
import { root } from '@lynx-js/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';

import { App } from './App';
import './App.css';

const queryClient = new QueryClient();

root.render(
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
