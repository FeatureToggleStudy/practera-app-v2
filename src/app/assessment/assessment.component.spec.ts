import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed, fakeAsync, tick, inject } from '@angular/core/testing';
import { QuestionsModule } from '@app/questions/questions.module';

import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { AssessmentComponent } from './assessment.component';
import { AssessmentService } from './assessment.service';
import { UtilsService } from '@services/utils.service';
import { NotificationService } from '@shared/notification/notification.service';
import { ActivityService } from '@app/activity/activity.service';
import { FastFeedbackService } from '@app/fast-feedback/fast-feedback.service';
import { BrowserStorageService } from '@services/storage.service';
import { SharedService } from '@services/shared.service';
import { FastFeedbackServiceMock } from '@testing/mocked.service';
import { of } from 'rxjs';
import { NewRelicService } from '@shared/new-relic/new-relic.service';
import { MockRouter, MockNewRelicService } from '@testing/mocked.service';

class Page {
  get savingMessage() {
    return this.query<HTMLElement>('ion-title.subTitle');
  }
  get assessmentName() {
    return this.query<HTMLElement>('h1');
  }
  get assessmentDescription() {
    return this.query<HTMLElement>('ion-content app-description');
  }
  get overDueMsg() {
    return this.query<HTMLElement>('p.over');
  }
  get dueMsg() {
    return this.query<HTMLElement>('p.due-date');
  }
  get submitterMsg() {
    return this.query<HTMLElement>('.review-submitter .title');
  }
  get lockedImg() {
    return this.query<HTMLElement>('ion-list.member-detail-container ion-avatar img');
  }
  get lockedTitle() {
    return this.query<HTMLElement>('ion-list.member-detail-container ion-label h4');
  }
  get groupNames() {
    return this.queryAll<HTMLElement>('form h3');
  }
  get groupDescriptions() {
    return this.queryAll<HTMLElement>('.g-description');
  }
  get questionNames() {
    return this.queryAll<HTMLElement>('.q-title');
  }
  get questionRequiredIndicators() {
    return this.queryAll<HTMLElement>('.required-indicator');
  }
  get questionInfos() {
    return this.queryAll<HTMLElement>('.icon-info');
  }
  get questionDescriptions() {
    return this.queryAll<HTMLElement>('.q-description');
  }
  get questionContent() {
    return this.queryAll<HTMLElement>('.q-content');
  }
  get noAnswerMsg() {
    return this.queryAll<HTMLElement>('.q-content p');
  }
  get submitBtn() {
    return this.query<HTMLButtonElement>('#btn-submit');
  }

  fixture: ComponentFixture<AssessmentComponent>;

  constructor(fixture: ComponentFixture<AssessmentComponent>) {
    this.fixture = fixture;
  }

  //// query helpers ////
  private query<T>(selector: string): T {
    return this.fixture.nativeElement.querySelector(selector);
  }

  private queryAll<T>(selector: string): T[] {
    return this.fixture.nativeElement.querySelectorAll(selector);
  }
}

describe('AssessmentComponent', () => {
  let component: AssessmentComponent;
  let fixture: ComponentFixture<AssessmentComponent>;
  let page: Page;
  let assessmentSpy: jasmine.SpyObj<AssessmentService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let activitySpy: jasmine.SpyObj<ActivityService>;
  let fastFeedbackSpy: jasmine.SpyObj<FastFeedbackService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let routeStub: Partial<ActivatedRoute>;
  let storageSpy: jasmine.SpyObj<BrowserStorageService>;
  let shared: SharedService;
  let utils: UtilsService;

  const mockAssessment = {
    name: 'test',
    description: 'test',
    isForTeam: false,
    dueDate: '2029-02-02',
    isOverdue: false,
    pulseCheck: false,
    groups: [{
      name: 'test groups',
      description: 'test groups description',
      questions: [
        {
          id: 123,
          name: 'test',
          description: 'test',
          canAnswer: true,
          canComment: false,
          type: 'text',
          isRequired: true,
          audience: ['participant', 'mentor']
        },
        {
          id: 124,
          name: 'test',
          description: 'test',
          canAnswer: true,
          canComment: false,
          type: 'text',
          isRequired: false,
          audience: ['participant', 'mentor']
        },
        {
          id: 125,
          name: 'test',
          description: 'test',
          canAnswer: true,
          canComment: false,
          type: 'multiple',
          isRequired: false,
          audience: ['participant', 'mentor']
        }
      ],
    }],
  };
  const mockSubmission = {
    id: 1,
    status: 'in progress',
    answers: [],
    submitterName: 'name',
    modified: '2019-02-02',
    isLocked: false,
    submitterImage: '',
    reviewerName: 'name'
  };
  const mockReview = {
    id: 1,
    answers: {},
    status: 'in progress',
    modified: '2019-02-02'
  };
  const mockUser = {
    role: 'participant',
    teamId: 1,
    projectId: 2,
    name: 'Test User',
    email: 'user@test.com',
    id: 1
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, QuestionsModule, HttpClientTestingModule],
      declarations: [AssessmentComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                id: 1,
                activityId: 2,
                contextId: 3,
                submissionId: 4
              }),
              data: {
                action: 'assessment',
                from: ''
              },
            },
            params: of(true),
          }
        },
        UtilsService,
        SharedService,
        {
          provide: NewRelicService,
          useClass: MockNewRelicService,
        },
        {
          provide: AssessmentService,
          useValue: jasmine.createSpyObj('AssessmentService', ['getAssessment', 'getSubmission', 'getFeedbackReviewed', 'saveAnswers', 'saveFeedbackReviewed', 'popUpReviewRating'])
        },
        {
          provide: NotificationService,
          useValue: jasmine.createSpyObj('NotificationService', ['alert', 'customToast', 'popUp', 'presentToast', 'modalOnly'])
        },
        {
          provide: ActivityService,
          useValue: jasmine.createSpyObj('ActivityService', ['getTasksByActivityId'])
        },
        {
          provide: FastFeedbackService,
          useClass: FastFeedbackServiceMock
        },
        {
          provide: BrowserStorageService,
          useValue: jasmine.createSpyObj('BrowserStorageService', ['getUser'])
        },
        {
          provide: Router,
          useClass: MockRouter,
        },
      ]
    }).compileComponents();

  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(AssessmentComponent);
    component = fixture.componentInstance;

    page = new Page(fixture);
    assessmentSpy = TestBed.get(AssessmentService);
    notificationSpy = TestBed.get(NotificationService);
    activitySpy = TestBed.get(ActivityService);
    fastFeedbackSpy = TestBed.get(FastFeedbackService);
    routeStub = TestBed.get(ActivatedRoute);
    routerSpy = TestBed.get(Router);
    storageSpy = TestBed.get(BrowserStorageService);
    shared = TestBed.get(SharedService);
    utils = TestBed.get(UtilsService);

    // initialise service calls
    assessmentSpy.getAssessment.and.returnValue(of(mockAssessment));
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: {},
      review: {}
    }));
    assessmentSpy.saveAnswers.and.returnValue(of({}));
    assessmentSpy.getFeedbackReviewed.and.returnValue(of(true));
    activitySpy.getTasksByActivityId.and.returnValue({
      currentActivity: {id: 1},
      nextTask: {type: 'assessment'}
    });
    storageSpy.getUser.and.returnValue(mockUser);
    component.routeUrl = '/test';
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should get correct parameters from routing', () => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.id).toEqual(1);
      expect(component.activityId).toEqual(2);
      expect(component.contextId).toEqual(3);
      expect(component.submissionId).toEqual(4);
      expect(component.action).toEqual('assessment');
    });
  });

  it('should get correct assessment and display correct info in html', () => {
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.assessment).toEqual(mockAssessment);
      expect(component.loadingAssessment).toEqual(false);
      expect(page.savingMessage).toBeTruthy();
      expect(page.assessmentName.innerHTML).toEqual(mockAssessment.name);
      expect(page.assessmentDescription).toBeTruthy();
      expect(page.overDueMsg).toBeFalsy();
      expect(page.dueMsg.innerHTML.trim()).toEqual(shared.dueDateFormatter(mockAssessment.dueDate));
      mockAssessment.groups.forEach((group, groupIndex) => {
        expect(page.groupNames[groupIndex].innerHTML).toEqual(group.name);
        expect(page.groupDescriptions[groupIndex]).toBeTruthy();
        group.questions.forEach((question, questionIndex) => {
          expect(page.questionNames[questionIndex].innerHTML).toContain(question.name);
          expect(page.questionDescriptions[questionIndex]).toBeTruthy();
        });
      });
      expect(notificationSpy.alert.calls.count()).toBe(0);
      expect(assessmentSpy.getSubmission.calls.count()).toBe(1);
    });
  });

  it('should pop up alert if it is team assessment and user is not in team', fakeAsync(() => {
      const tmpAssessment = JSON.parse(JSON.stringify(mockAssessment));
      tmpAssessment.isForTeam = true;
      assessmentSpy.getAssessment.and.returnValue(of(tmpAssessment));
      const tmpUser = JSON.parse(JSON.stringify(mockUser));
      tmpUser.teamId = null;
      storageSpy.getUser.and.returnValue(tmpUser);

      tick(); // getAssessment
      tick(); // getSubmission
      tick(); // getFeedbackReviewed

      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(notificationSpy.alert.calls.count()).toBe(1);
        // we need to call getSubmission to determine the values for doReview/doAssessment
        expect(assessmentSpy.getSubmission.calls.count()).toBe(1);
      });
    })
  );

  it('should get correct in progress submission', () => {
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: mockSubmission,
      review: {}
    }));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.submission).toEqual(mockSubmission);
      expect(component.loadingSubmission).toEqual(false);
      expect(component.doAssessment).toBe(true);
      expect(component.doReview).toBe(false);
      expect(component.savingMessage).toEqual('Last saved ' + utils.timeFormatter(mockSubmission.modified));
      expect(component.savingButtonDisabled).toBe(false);
    });
  });

  it('should get correct in progress locked submission', () => {
    const tmpSubmission = JSON.parse(JSON.stringify(mockSubmission));
    tmpSubmission.isLocked = true;
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: tmpSubmission,
      review: {}
    }));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.doAssessment).toBe(false);
      expect(component.doReview).toBe(false);
      expect(component.savingButtonDisabled).toBe(true);
      expect(component.submission.status).toEqual('done');
    });
  });

  it('should get correct done submission', () => {
    const tmpSubmission = JSON.parse(JSON.stringify(mockSubmission));
    tmpSubmission.status = 'done';
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: tmpSubmission,
      review: {}
    }));
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.submission).toEqual(tmpSubmission);
      expect(component.loadingSubmission).toEqual(false);
      expect(component.doAssessment).toBe(false);
      expect(component.doReview).toBe(false);
      expect(component.savingButtonDisabled).toBe(true);
    });
  });

  it('should get correct in progress review', () => {
    const tmpSubmission = JSON.parse(JSON.stringify(mockSubmission));
    tmpSubmission.status = 'pending review';
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: tmpSubmission,
      review: mockReview
    }));
    routeStub.snapshot.data.action = 'review';
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.review).toEqual(mockReview);
      expect(component.doAssessment).toBe(false);
      expect(component.doReview).toBe(true);
      expect(component.savingButtonDisabled).toBe(false);
      expect(assessmentSpy.getFeedbackReviewed.calls.count()).toBe(0);
    });
  });

  it('should get correct published review', () => {
    const tmpSubmission = JSON.parse(JSON.stringify(mockSubmission));
    tmpSubmission.status = 'published';
    const tmpReview = JSON.parse(JSON.stringify(mockReview));
    tmpReview.status = '';
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: tmpSubmission,
      review: tmpReview
    }));

    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(component.review).toEqual(tmpReview);
      expect(component.doAssessment).toBe(false, 'not do assessment');
      expect(component.doReview).toBe(false, 'not do review');
      expect(component.savingButtonDisabled).toBe(true);
      expect(assessmentSpy.getFeedbackReviewed.calls.count()).toBe(1);
      expect(component.feedbackReviewed).toBe(true);
      expect(component.loadingFeedbackReviewed).toBe(false);
    });
  });

  it('should navigate to the correct page #1', () => {
    component.fromPage = 'reviews';
    component.navigationRoute();
    expect(routerSpy.navigate.calls.first().args[0]).toEqual(['app', 'reviews']);
  });

  it('should navigate to the correct page #2', () => {
    assessmentSpy.getSubmission.and.returnValue(of({
      submission: {},
      review: {}
    }));

    component.fromPage = 'events';
    component.navigationRoute();
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      expect(routerSpy.navigate.calls.first().args[0]).toEqual(['events']);
    });
  });

  it('should navigate to the correct page #3', fakeAsync(() => {
    component.activityId = 1;
    tick();
    const test = component.navigationRoute();
    tick();
    expect(component.activityId).toEqual(1);
    expect(routerSpy.navigate.calls.first().args[0]).toEqual(['app', 'activity', 1]);
  }));

  it('should navigate to the correct page #4', () => {
    component.activityId = null;
    component.navigationRoute();
    expect(routerSpy.navigate.calls.first().args[0]).toEqual(['app', 'home']);
  });

  it('should pop up mark feedback as read confirmation when going back', () => {
    component.action = 'assessment';
    component.submission.status = 'published';
    component.feedbackReviewed = false;
    component.back();
    expect(routerSpy.navigate.calls.count()).toBe(0);
  });

  it('should save in progress and navigate to other page when going back', () => {
    component.back();
    expect(component.savingMessage).toContain('Last saved');
    expect(routerSpy.navigate.calls.first().args[0]).toEqual(['app', 'home']);
  });

  it('should list unanswered required questions from compulsoryQuestionsAnswered()', () => {
    expect(component.compulsoryQuestionsAnswered).toBeDefined();
    component.assessment = mockAssessment;
    const answers = [
      {
        'assessment_question_id': 123,
        'answer': null
      },
      {
        'assessment_question_id': 124,
        'answer': null
      }
    ];
    expect(component.compulsoryQuestionsAnswered(answers)).toEqual([answers[0]]);
  });

  it('should return empty from compulsoryQuestionsAnswered() if all required question has been answered', () => {
    expect(component.compulsoryQuestionsAnswered).toBeDefined();
    component.assessment = mockAssessment;
    const answers = [
      {
        'assessment_question_id': 123,
        'answer': 'abc'
      },
      {
        'assessment_question_id': 124,
        'answer': null
      }
    ];
    expect(component.compulsoryQuestionsAnswered(answers)).toEqual([]);
  });

  describe('should get correct assessment answers when', () => {
    let assessment;
    let answers;

    beforeEach(() => {
      fixture.detectChanges();
      component.id = 1;
      component.doAssessment = true;
      component.contextId = 2;
      component.assessment.isForTeam = true;
      component.questionsForm.patchValue({
        'q-123': 'abc',
        'q-124': null,
        'q-125': null
      });
    });

    afterEach(() => {
      expect(component.savingButtonDisabled).toBe(false);
      expect(notificationSpy.popUp.calls.count()).toBe(0);
      expect(assessment.id).toBe(1);
      expect(assessment.context_id).toBe(2);
      expect(answers).toEqual([
        {
          assessment_question_id: 123,
          answer: 'abc'
        },
        {
          assessment_question_id: 124,
          answer: ''
        },
        {
          assessment_question_id: 125,
          answer: []
        }
      ]);
    });

    it('saving in progress', () => {
      component.submit(true);
      assessment = assessmentSpy.saveAnswers.calls.first().args[0];
      answers = assessmentSpy.saveAnswers.calls.first().args[1];
      expect(component.submitting).toBe(false);
      expect(component.savingMessage).toContain('Last saved');
      expect(assessment.in_progress).toBe(true);
      expect(assessment.unlock).toBeFalsy();
    });

    it('saving in progress, and unlock the submission for team assessment', () => {
      component.submit(true, true);
      assessment = assessmentSpy.saveAnswers.calls.first().args[0];
      answers = assessmentSpy.saveAnswers.calls.first().args[1];
      expect(assessment.unlock).toBe(true);
    });

    it('submitting', () => {
      component.submit(false);
      assessment = assessmentSpy.saveAnswers.calls.first().args[0];
      answers = assessmentSpy.saveAnswers.calls.first().args[1];
      expect(component.submitting).toEqual('Retrieving new task...');
      expect(component.saving).toBe(false);
      expect(assessment.in_progress).toBe(false);
    });
  });

  it('should pop up alert if required answer missing when submitting', fakeAsync(() => {
    const tmpAssessment = JSON.parse(JSON.stringify(mockAssessment));
    assessmentSpy.getAssessment.and.returnValue(of(tmpAssessment));

    component.doAssessment = true;
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      component.questionsForm.patchValue({
        'q-123': null,
        'q-124': null,
        'q-125': null
      });
      component.submit(false);
      tick();
      expect(component.submitting).toBe(false);
      expect(notificationSpy.popUp.calls.count()).toBe(1);
    });
  }));

  describe('submitting assessment submit(false)', () => {
    const activityId = 1;
    const emptyAnswers = [];
    const action = 'assessment';
    const assessmentId = 0;

    beforeEach(() => {
      component.id = activityId;
      component.action = action;
      component.assessment = {
        name: 'Test Assessment',
        description: 'Test Description',
        isForTeam: false,
        dueDate: '',
        isOverdue: false,
        groups: [],
        pulseCheck: true,
      };
      // component.doAssessment = true;
    });

    it('should be called with correct assessment answer/action/activity status', fakeAsync(() => {
      const tmpAssessment = JSON.parse(JSON.stringify(mockAssessment));
      assessmentSpy.getAssessment.and.returnValue(of(tmpAssessment));
      tick();

      component.submit(false);
      tick();

      expect(assessmentSpy.saveAnswers).toHaveBeenCalled();
      expect(assessmentSpy.saveAnswers).toHaveBeenCalledWith(
        {
          id: activityId,
          in_progress: false, // default value
        },
        emptyAnswers,
        action,
        assessmentId
      );
      tick(10 * 1000); // 10 secs
    }));

    it('should check fastfeedback availability as pulseCheck is `true`', fakeAsync(() => {
      component.submit(false);
      const spy = spyOn(fastFeedbackSpy, 'pullFastFeedback').and.returnValue(of(fastFeedbackSpy.pullFastFeedback()));
      spyOn(component, 'redirectToNextMilestoneTask');
      spyOn(component, 'navigationRoute');

      tick(12 * 1000); // simulate 12sec (submission 10s & fastfeedback 2s)

      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(fastFeedbackSpy.pullFastFeedback.calls.count()).toEqual(1);
        expect(notificationSpy.presentToast.calls.count()).toEqual(1);

        if (component.doReview === true) {
          expect(component.navigationRoute).toHaveBeenCalled();
        } else {
          expect(component.redirectToNextMilestoneTask).toHaveBeenCalled();
        }
      });
    }));

    it('should skip fastfeedback if pulsecheck = false', () => {
      component.assessment.pulseCheck = false;
      spyOn(fastFeedbackSpy, 'pullFastFeedback');
      spyOn(component, 'redirectToNextMilestoneTask');

      component.submit(false);
      expect(fastFeedbackSpy.pullFastFeedback.calls.count()).toEqual(0);
      expect(notificationSpy.presentToast.calls.count()).toEqual(0);
      expect(component.redirectToNextMilestoneTask).toHaveBeenCalled();
    });
  });
});
