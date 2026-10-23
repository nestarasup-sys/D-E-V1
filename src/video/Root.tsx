import {Composition} from 'remotion';
import {Documentary} from './Documentary';
import {projectDuration,starterProject,type Project} from '../model/project';
export const Root=()=> <Composition id="DarkStudio" component={Documentary} fps={30} width={1920} height={1080} durationInFrames={projectDuration(starterProject)} defaultProps={{project:starterProject}} calculateMetadata={({props}:{props:{project:Project}})=>({durationInFrames:Math.max(1,projectDuration(props.project))})}/>;
