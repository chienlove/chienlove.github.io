import CMS from "netlify-cms-app";
import { SlidesControl, SlidesPreview } from "./Slides";

CMS.registerWidget("slides", SlidesControl, SlidesPreview);