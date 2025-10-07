import Layout from "./Layout.jsx";

import AddStation from "./AddStation";

import NowPlaying from "./NowPlaying";

import Settings from "./Settings";

import Resources from "./Resources";

import LikedTracks from "./LikedTracks";

import RecentTracks from "./RecentTracks";

import WhatsPlayingNow from "./WhatsPlayingNow";

import About from "./About";

import Home from "./Home";

import Playlists from "./Playlists";

import AddPodcast from "./AddPodcast";

import Podcasts from "./Podcasts";

import AllStations from "./AllStations";

import AllPodcasts from "./AllPodcasts";

import InProgressEpisodes from "./InProgressEpisodes";

import Downloads from "./Downloads";

import AddAudiobook from "./AddAudiobook";

import MyAudiobooks from "./MyAudiobooks";

import Discover from "./Discover";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AddStation: AddStation,
    
    NowPlaying: NowPlaying,
    
    Settings: Settings,
    
    Resources: Resources,
    
    LikedTracks: LikedTracks,
    
    RecentTracks: RecentTracks,
    
    WhatsPlayingNow: WhatsPlayingNow,
    
    About: About,
    
    Home: Home,
    
    Playlists: Playlists,
    
    AddPodcast: AddPodcast,
    
    Podcasts: Podcasts,
    
    AllStations: AllStations,
    
    AllPodcasts: AllPodcasts,
    
    InProgressEpisodes: InProgressEpisodes,
    
    Downloads: Downloads,
    
    AddAudiobook: AddAudiobook,
    
    MyAudiobooks: MyAudiobooks,
    
    Discover: Discover,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<AddStation />} />
                
                
                <Route path="/AddStation" element={<AddStation />} />
                
                <Route path="/NowPlaying" element={<NowPlaying />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Resources" element={<Resources />} />
                
                <Route path="/LikedTracks" element={<LikedTracks />} />
                
                <Route path="/RecentTracks" element={<RecentTracks />} />
                
                <Route path="/WhatsPlayingNow" element={<WhatsPlayingNow />} />
                
                <Route path="/About" element={<About />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Playlists" element={<Playlists />} />
                
                <Route path="/AddPodcast" element={<AddPodcast />} />
                
                <Route path="/Podcasts" element={<Podcasts />} />
                
                <Route path="/AllStations" element={<AllStations />} />
                
                <Route path="/AllPodcasts" element={<AllPodcasts />} />
                
                <Route path="/InProgressEpisodes" element={<InProgressEpisodes />} />
                
                <Route path="/Downloads" element={<Downloads />} />
                
                <Route path="/AddAudiobook" element={<AddAudiobook />} />
                
                <Route path="/MyAudiobooks" element={<MyAudiobooks />} />
                
                <Route path="/Discover" element={<Discover />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}