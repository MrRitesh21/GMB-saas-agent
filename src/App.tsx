import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Auth } from './pages/Auth'
import { Overview } from './pages/Overview'
import { Photos } from './pages/Photos'
import { Posts } from './pages/Posts'
import { PublicReview } from './pages/PublicReview'
import { ReviewLink } from './pages/ReviewLink'
import { Reviews } from './pages/Reviews'
import { Seo } from './pages/Seo'
import { Settings } from './pages/Settings'
import { Shell } from './pages/Shell'
import { ToastProvider } from './ui'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/r/:slug" element={<PublicReview />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Overview />} />
            <Route path="seo" element={<Seo />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="review-link" element={<ReviewLink />} />
            <Route path="posts" element={<Posts />} />
            <Route path="photos" element={<Photos />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Auth />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
