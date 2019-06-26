import { TopicService, Topic } from './topic.service';
import { Component, OnInit } from '@angular/core';
import { EmbedVideoService } from 'ngx-embed-video';
import { Router, ActivatedRoute } from '@angular/router';
import { FilestackService } from '@shared/filestack/filestack.service';
import { RouterEnter } from '@services/router-enter.service';
import { UtilsService } from '@services/utils.service';
import { BrowserStorageService } from '@services/storage.service';
import { NotificationService } from '@shared/notification/notification.service';
import { ActivityService } from '../activity/activity.service';
import { SharedService } from '@services/shared.service';

@Component({
  selector: 'app-topic',
  templateUrl: './topic.component.html',
  styleUrls: ['./topic.component.scss']
})
export class TopicComponent extends RouterEnter {
  routeUrl = '/topic/';
  topic: Topic = {
    id: 0,
    title: '',
    content: '',
    videolink: '',
    files: [],
    hasComments: false
  };
  iframeHtml = '';
  btnToggleTopicIsDone = false;
  loadingMarkedDone = true;
  loadingTopic = true;
  id = 0;
  activityId = 0;
  topicProgress: number;
  isLoadingPreview = false;
  timer = 0;

  constructor(
    private topicService: TopicService,
    private embedService: EmbedVideoService,
    public router: Router,
    private route: ActivatedRoute,
    private filestackService: FilestackService,
    public storage: BrowserStorageService,
    public utils: UtilsService,
    public notificationService: NotificationService,
    private activityService: ActivityService,
    private sharedService: SharedService,

  ) {
    super(router);
  }

  private _initialise() {
    this.topic = {
      id: 0,
      title: '',
      content: '',
      videolink: '',
      files: [],
      hasComments: false
    };
    this.loadingMarkedDone = true;
    this.loadingTopic = true;
  }

  onEnter() {
    this._initialise();
    var dateObj = new Date();
    this.timer = dateObj.getTime();
    this.id = +this.route.snapshot.paramMap.get('id');
    this.activityId = +this.route.snapshot.paramMap.get('activityId');
    this._getTopic();
    this._getTopicProgress();
  }

  private _getTopic() {
    this.topicService.getTopic(this.id)
      .subscribe(topic => {
        this.topic = topic;
        this.loadingTopic = false;
        if ( topic.videolink ) {
          this.iframeHtml = this.embedService.embed(this.topic.videolink);
        }
      });
  }

  private _getTopicProgress() {
    this.topicService.getTopicProgress(this.activityId, this.id)
      .subscribe(result => {
        this.topicProgress = result;
        if (this.topicProgress !== null && this.topicProgress !== undefined) {
          if (this.topicProgress === 1) {
            this.btnToggleTopicIsDone = true;
          }
        }
        this.loadingMarkedDone = false;
      });
  }

  /**
   * @name markAsDone
   * @description set a topic as read by providing current id
   * @param {Function} callback optional callback function for further action after subcription is completed
   */
  markAsDone(callback?) {
    return this.topicService.updateTopicProgress(this.id).subscribe(() => {
      // toggle event change should happen after subscription is completed
      this.btnToggleTopicIsDone = true;
      if (callback !== undefined) {
        return callback();
      }
      return this.nextStepPrompt();

    });
  }

  async previewFile(file) {
    if (this.isLoadingPreview === false) {
      this.isLoadingPreview = true;
      await this.filestackService.previewFile(file);
      this.isLoadingPreview = false;
    }
  }

  private findNext(tasks) {
    const currentIndex = tasks.findIndex(task => {
      return task.id === this.id;
    });

    const nextIndex = currentIndex + 1;
    if (tasks[nextIndex]) {
      return tasks[nextIndex];
    }

    return null;
  }

  /**
   * @name navigateBySequence
   * @param {[type]} sequence [description]
   */
  private navigateBySequence(sequence) {
    const { contextId, isForTeam, id, type } = sequence;

    switch (type) {
      case 'Assessment':
        if (isForTeam && !this.storage.getUser().teamId) {
          return this.notificationService.popUp('shortMessage', {message: 'To do this assessment, you have to be in a team.'});
        }
        return this.router.navigate(['assessment', 'assessment', this.activityId , contextId, id]);
      case 'Topic':
        this.router.navigate(['topic', this.activityId, id]);
        break;

      default:
        return this.router.navigate(['app', 'activity', this.activityId]);
    }
  }

  getNextSequence() {
    const tasks = this.sharedService.getCache('tasks');
    let nextTask = null;

    // added extra if-statement for efficient data reuse (no need extra API call if cache exist)
    if (tasks && tasks.length > 0) {
      nextTask = this.findNext(tasks);
    } else {
      this.loadingTopic = true;
      this.activityService.getActivity(this.activityId).subscribe(activity => {
        this.loadingTopic = false;
        this.sharedService.setCache('tasks', activity.tasks);
        nextTask = this.findNext(activity.tasks);
      });
    }

    return nextTask;
  }

  nextStepPrompt() {
    const nextSequence = this.getNextSequence();
    if (nextSequence) {
      return this.notificationService.alert({
        header: 'Task complete',
        message: 'Continue to next task?',
        buttons: [
          {
            text: 'No',
            handler: () => {
              return this.router.navigate(['app', 'activity', this.activityId]);
            },
          },
          {
            text: 'Yes',
            handler: () => {
              return this.navigateBySequence(nextSequence);
            }
          }
        ]
      });
    }

    return this.router.navigate(['app', 'activity', this.activityId]);
  }

  back() {
    if (this.btnToggleTopicIsDone) {
      return this.router.navigate(['app', 'activity', this.activityId]);
    }
    var dateObj = new Date();
    if (dateObj.getTime() - this.timer < 10000) {
      return this.router.navigate(['app', 'activity', this.activityId]);
    }
    const type = 'Topic';
    return this.notificationService.alert({
      header: `Complete ${type}?`,
      message: 'Would you like to mark this task as done?',
      buttons: [
        {
          text: 'No',
          handler: () => {
            return this.router.navigate(['app', 'activity', this.activityId]);
          },
        },
        {
          text: 'Yes',
          handler: () => {
            return this.markAsDone(() => {
              // back to project, if next sequence isn't available
              const nextSequence = this.getNextSequence();
              if (!nextSequence) {
                this.notificationService.popUp('shortMessage', { message: 'You\'ve completed the task!' });
                return this.router.navigate(['app', 'project']);
              }
              return this.router.navigate(['app', 'activity', this.activityId]);

              //return this.nextStepPrompt();
            });
          }
        }
      ]
    });
  }

}
