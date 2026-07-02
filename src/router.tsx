import { createBrowserRouter } from 'react-router-dom'
import App from '@/App'
import LandingPage from '@/pages/LandingPage'
import ValidatePage from '@/pages/ValidatePage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: 'validate', element: <ValidatePage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
