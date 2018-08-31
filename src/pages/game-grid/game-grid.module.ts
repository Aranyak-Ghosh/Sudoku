import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { GameGridPage } from './game-grid';

@NgModule({
  declarations: [
    GameGridPage,
  ],
  imports: [
    IonicPageModule.forChild(GameGridPage),
  ],
})
export class GameGridPageModule {}
