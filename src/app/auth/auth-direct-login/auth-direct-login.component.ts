import { Component, OnInit, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { Observable, concat } from 'rxjs';
import { NotificationService } from '@shared/notification/notification.service';
import { SwitcherService } from '../../switcher/switcher.service';
import { UtilsService } from '@services/utils.service';
import { BrowserStorageService } from '@services/storage.service';
import { NewRelicService } from '@shared/new-relic/new-relic.service';

@Component({
  selector: 'app-auth-direct-login',
  templateUrl: 'auth-direct-login.component.html',
  // styles: ['']
})
export class AuthDirectLoginComponent implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
    public utils: UtilsService,
    private switcherService: SwitcherService,
    private storage: BrowserStorageService,
    private ngZone: NgZone,
    private newRelic: NewRelicService
  ) {}

  async ngOnInit() {
    this.newRelic.setPageViewName('direct-login');
    const authToken = this.route.snapshot.paramMap.get('authToken');
    if (!authToken) {
      return this._error();
    }

    try {
      const nrDirectLoginTracer = this.newRelic.createTracer('Processing direct login');
      const loginStatus = await this.authService.directLogin({ authToken }).toPromise();
      const userInfo = await this.switcherService.getMyInfo().toPromise();
      nrDirectLoginTracer();
      return this._redirect();
    } catch (err) {
      this._error();
    }
  }

  // force every navigation happen under radar of angular
  private navigate(direction): Promise<boolean> {
    return this.ngZone.run(() => {
      this.newRelic.setCustomAttribute('redirection', direction);
      return this.router.navigate(direction);
    });
  }

  /**
   * Redirect user to a specific page if data is passed in, otherwise redirect to program switcher page
   */
  private async _redirect(): Promise<boolean> {
    const redirect = this.route.snapshot.paramMap.get('redirect');
    const timelineId = +this.route.snapshot.paramMap.get('tl');
    const activityId = +this.route.snapshot.paramMap.get('act');
    const contextId = +this.route.snapshot.paramMap.get('ctxt');
    const assessmentId = +this.route.snapshot.paramMap.get('asmt');
    const submissionId = +this.route.snapshot.paramMap.get('sm');
    if (!redirect || !timelineId) {
      // if there's no redirection or timeline id
      return this.navigate(['switcher']);
    }
    const program = this.utils.find(this.storage.get('programs'), value => {
      return value.timeline.id === timelineId;
    });
    if (this.utils.isEmpty(program)) {
      // if the timeline id is not found
      return this.navigate(['switcher']);
    }
    // switch to the program
    await this.switcherService.switchProgram(program);

    switch (redirect) {
      case 'home':
        return this.navigate(['app', 'home']);
      case 'project':
        return this.navigate(['app', 'project']);
      case 'activity':
        if (!activityId) {
          return this.navigate(['app', 'home']);
        }
        return this.navigate(['app', 'activity', activityId]);
      case 'assessment':
        if (!activityId || !contextId || !assessmentId) {
          return this.navigate(['app', 'home']);
        }
        return this.navigate(['assessment', 'assessment', activityId, contextId, assessmentId]);
      case 'reviews':
        return this.navigate(['app', 'reviews']);
      case 'review':
        if (!contextId || !assessmentId || !submissionId) {
          return this.navigate(['app', 'home']);
        }
        return this.navigate(['assessment', 'review', contextId, assessmentId, submissionId]);
      case 'chat':
        return this.navigate(['app', 'chat']);
      case 'settings':
        return this.navigate(['app', 'settings']);
      default:
        return this.navigate(['app', 'home']);
    }
    return this.navigate(['app', 'home']);
  }

  private _error(res?): Promise<any> {
    this.newRelic.noticeError('failed direct login', res ? JSON.stringify(res) : undefined);
    return this.notificationService.alert({
      message: 'Your link is invalid or expired.',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          handler: () => {
            this.navigate(['login']);
          }
        }
      ]
    });
  }

}
