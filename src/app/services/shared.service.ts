import { Injectable } from '@angular/core';
import { UtilsService } from '@services/utils.service';
import { BrowserStorageService } from '@services/storage.service';
import { PusherService } from '@shared/pusher/pusher.service';
import { NotificationService } from '@shared/notification/notification.service';
import { RequestService } from '@shared/request/request.service';

export interface Profile {
  contact_number : string,
  email?: string,
  sendsms?: boolean
}

const api = {
  post: {
    profile: 'api/v2/user/enrolment/edit.json',
  },
};

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private achievementEvent;
  constructor(
    private utils: UtilsService,
    private storage: BrowserStorageService,
    public pusherService: PusherService,
    private notification: NotificationService,
    private request : RequestService,
  ) {}

  // call this function on every page refresh
  onPageLoad() {
    // only do these if a timeline is choosen
    if (!this.storage.getUser().timelineId) {
      return;
    }
    // check and change theme color on every page refresh
    let color = this.storage.getUser().themeColor;
    if (color) {
      this.utils.changeThemeColor(color);
    }
    let image = this.storage.getUser().activityCardImage;
    if (image) {
      this.utils.changeCardBackgroundImage(image);
    }
    // initialise Pusher
    this.pusherService.initialisePusher();
    // subscribe to Pusher channels
    this.pusherService.getChannels().subscribe();

    // listen to the achievement event
    if (!this.achievementEvent) {
      this.achievementEvent = this.utils.getEvent("achievement").subscribe(event => {
        this.notification.achievementPopUp('notification', {
          id: event.meta.Achievement.id,
          name: event.meta.Achievement.name,
          description: event.meta.Achievement.description,
          points: event.meta.Achievement.points,
          image: event.meta.Achievement.badge
        });
      });
    }
  }

  updateProfile(data: Profile) {
    return this.request.post(api.post.profile, data);
  }
}
