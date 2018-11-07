import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthRoutingModule } from './auth-routing.module';

import { AuthComponent } from './auth.component';
import { AuthLoginComponent } from './auth-login/auth-login.component';
import { AuthForgotPasswordComponent } from './auth-forgot-password/auth-forgot-password.component';
import { PopUpComponent } from '../components/pop-up/pop-up.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    AuthRoutingModule
  ],
  declarations: [
    AuthComponent, 
    AuthLoginComponent,
    AuthForgotPasswordComponent,
    PopUpComponent
  ],
  entryComponents: [
    PopUpComponent
  ]
})
export class AuthModule {}