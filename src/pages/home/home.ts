import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';


import { GameGridPage } from "../game-grid/game-grid";
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(public navCtrl: NavController) {

  }

  ionViewDidLoad(){
    console.log('Entered Home Page');
  }

  goToGame(){
    this.navCtrl.push(GameGridPage);
  }

}
