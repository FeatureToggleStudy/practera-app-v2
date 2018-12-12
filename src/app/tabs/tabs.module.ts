import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TabsRoutingModule } from './tabs-routing.module';
import { TabsComponent } from './tabs.component';

import { ChatListComponent } from '../chat/chat-list/chat-list.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TabsRoutingModule,
  ],
  declarations: [ 
    TabsComponent,
    ChatListComponent
  ]
})
export class TabsModule {}
