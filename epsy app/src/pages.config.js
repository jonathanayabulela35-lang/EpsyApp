/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccountAccess from './pages/AccountAccess';
import AdminBuilder from './pages/AdminBuilder';
import AdminChallengeDays from './pages/AdminChallengeDays';
import AdminChallenges from './pages/AdminChallenges';
import AdminDecoder from './pages/AdminDecoder';
import ChallengeView from './pages/ChallengeView';
import Home from './pages/Home';
import InsightLibrary from './pages/InsightLibrary';
import Personalisation from './pages/Personalisation';
import QuestionBuilder from './pages/QuestionBuilder';
import QuestionDecoder from './pages/QuestionDecoder';
import SchoolDashboard from './pages/SchoolDashboard';
import Settings from './pages/Settings';
import SchoolStudentAccess from './pages/SchoolStudentAccess';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountAccess": AccountAccess,
    "AdminBuilder": AdminBuilder,
    "AdminChallengeDays": AdminChallengeDays,
    "AdminChallenges": AdminChallenges,
    "AdminDecoder": AdminDecoder,
    "ChallengeView": ChallengeView,
    "Home": Home,
    "InsightLibrary": InsightLibrary,
    "Personalisation": Personalisation,
    "QuestionBuilder": QuestionBuilder,
    "QuestionDecoder": QuestionDecoder,
    "SchoolDashboard": SchoolDashboard,
    "Settings": Settings,
    "SchoolStudentAccess": SchoolStudentAccess,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};